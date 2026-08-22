import { CategoryType, ItemType, PaginatedData, RequestStatus, RequestType, ResponseData, WishlistType } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { haversineKm } from "@/lib/distance";
import { getMyOrgLite } from "./organisations";
import { notifyFollowersOfListing } from "./orgSocial";

/** Fetch the authenticated user's lat/lng from Firestore. Returns null if unavailable. */
async function getUserLocation(uid: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const doc = await db.collection('users').doc(uid).get();
        const data = doc.data();
        if (data?.lat && data?.lng) return { lat: data.lat, lng: data.lng };
    } catch {}
    return null;
}

/** Sort and optionally filter items by distance from a point. Items without coords go to the end. */
function sortByDistance(
    items: ItemType[],
    userLat: number,
    userLng: number,
    maxKm?: number
): ItemType[] {
    let withDist = items.map((item) => ({
        ...item,
        distance:
            item.lat != null && item.lng != null
                ? haversineKm(userLat, userLng, item.lat, item.lng)
                : undefined,
    }));
    if (maxKm != null) {
        // Items with no coordinates are dropped here: an explicit radius is a
        // request for things nearby, and we can't claim an unlocated item qualifies.
        withDist = withDist.filter((i) => i.distance != null && i.distance <= maxKm);
    }
    return withDist.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
    });
}

export async function addItem(item: ItemType): Promise<ResponseData<string | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);

        if (!tokens) {
            throw new Error('Unauthorized');
        }

        // Use the location pinned in the form; fall back to user profile location
        let locationFields: Partial<ItemType> = {};
        if (item.lat && item.lng) {
            // Form supplied coordinates (user pinned the map)
            locationFields = { lat: item.lat, lng: item.lng, locationName: item.locationName ?? '' };
        } else {
            // Fall back: stamp from user profile
            const userLocation = await getUserLocation(tokens.decodedToken.uid);
            if (userLocation) {
                const userDoc = await db.collection('users').doc(tokens.decodedToken.uid).get();
                locationFields = {
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    locationName: userDoc.data()?.preferedLocation ?? '',
                };
            }
        }

        // If they act for an active organisation, the listing belongs to it —
        // resolved server-side so a client cannot claim someone else's org.
        const org = await getMyOrgLite();

        const docRef = await db.collection('items').add({
            ...item,
            ...(org ? { orgId: org.orgId, orgName: org.name, orgSlug: org.slug } : {}),
            ...locationFields,
            donatedTo: null,
            donatedOn: null,
            views: 0,
            createdBy: tokens.decodedToken.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        // Anyone following the organisation hears about it. Not awaited: the
        // person listing should not wait on a fan-out, and a failure here must
        // never lose them the listing they just wrote.
        if (org) {
            void notifyFollowersOfListing({
                orgId: org.orgId,
                itemId: docRef.id,
                listedBy: tokens.decodedToken.uid,
            });
        }

        return {
            success: true,
            message: "Item added successfully",
            data: docRef.id
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export async function updateItem(item: ItemType, id: string): Promise<ResponseData<ItemType | null>> {
    'use server';

    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        const newItem = {
            ...item,
            updatedAt: new Date().toISOString()
        }
        await db.collection('items').doc(id).update(newItem);
        return {
            success: true,
            message: "Item updated successfully",
            data: newItem
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export async function getMyItems({
    query,
    queryBy = "name",
    page = 1,
    limit = 8
}: {
    query?: string,
    queryBy?: "name" | "condition" | "categories",
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        let queryRef = db.collection('items')
            .where('createdBy', '==', tokens.decodedToken.uid)
            .where('donatedTo', '==', null); // Only get items that haven't been donated

        if (query) {
            if (queryBy === "categories") {
                queryRef = queryRef.where(queryBy, 'array-contains', query);
            } else {
                queryRef = queryRef.where(queryBy, '>=', query).where(queryBy, '<=', query + '\uf8ff');
            }
        }

        const startAt = (page - 1) * limit;

        const querySnapshot = await queryRef
            .orderBy(queryBy === "categories" ? "name" : queryBy) // Fallback to ordering by name if queryBy is category
            .startAt(startAt)
            .limit(limit)
            .get();

        const items = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
        } as ItemType));

        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        return {
            success: true,
            message: "Items fetched successfully",
            data: { items, total, page, limit }
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export interface HomeFeed {
    /** Newest listings — drives the "just listed" rail */
    fresh: ItemType[];
    /** Most viewed, proximity-sorted when we know where the viewer is */
    popular: ItemType[];
    /** Closest listings; empty when the viewer has no saved location */
    nearby: ItemType[];
    /** Live listing count per category id, for the category strip */
    categoryCounts: Record<string, number>;
    totalAvailable: number;
}

/**
 * Everything the homepage needs from one collection read. Previously the page
 * would have needed a separate query per rail; each slice below is derived from
 * the same pool in memory.
 */
export async function getHomeFeed(): Promise<ResponseData<HomeFeed | null>> {
    'use server';
    try {
        let userLocation: { lat: number; lng: number } | null = null;
        try {
            const tokens = await getTokens(await cookies(), authConfig);
            if (tokens) userLocation = await getUserLocation(tokens.decodedToken.uid);
        } catch {}

        // Single equality filter keeps this off any composite index.
        const snapshot = await db
            .collection('items')
            .where('donatedTo', '==', null)
            .limit(LISTINGS_POOL)
            .get();

        const pool: ItemType[] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ItemType));

        const categoryCounts: Record<string, number> = {};
        pool.forEach((item) =>
            item.categories?.forEach((c) => {
                if (c?.id) categoryCounts[c.id] = (categoryCounts[c.id] ?? 0) + 1;
            })
        );

        const fresh = [...pool]
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
            .slice(0, 12);

        let popular = [...pool].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        let nearby: ItemType[] = [];

        if (userLocation) {
            // Distance-annotate everything so cards can show "1.2 km away"
            const ranked = sortByDistance(pool, userLocation.lat, userLocation.lng);
            nearby = ranked.slice(0, 12);

            const distanceById = new Map(ranked.map((i) => [i.id, i.distance]));
            const annotate = (list: ItemType[]) =>
                list.map((i) => ({ ...i, distance: distanceById.get(i.id) }));
            popular = annotate(popular);
            return {
                success: true,
                message: "Home feed fetched successfully",
                data: {
                    fresh: annotate(fresh),
                    popular: popular.slice(0, 8),
                    nearby,
                    categoryCounts,
                    totalAvailable: pool.length,
                },
            };
        }

        return {
            success: true,
            message: "Home feed fetched successfully",
            data: {
                fresh,
                popular: popular.slice(0, 8),
                nearby,
                categoryCounts,
                totalAvailable: pool.length,
            },
        };
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return { success: false, message: message, data: null };
    }
}

export async function getMyDonations({
    query,
    queryBy = "name",
    page = 1,
    limit = 8
}: {
    query?: string,
    queryBy?: "name" | "condition" | "categories",
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        
        let queryRef = db.collection('items').where('createdBy', '==', tokens.decodedToken.uid).where('donatedTo', '!=', null);

        if (query) {
            if (queryBy === "categories") {
                queryRef = queryRef.where(queryBy, 'array-contains', query);
            } else {
                queryRef = queryRef.where(queryBy, '>=', query).where(queryBy, '<=', query + '\uf8ff');
            }
        }

        const startAt = (page - 1) * limit;

        const querySnapshot = await queryRef
            .orderBy(queryBy === "categories" ? "name" : queryBy) // Fallback to ordering by name if queryBy is category
            .startAt(startAt)
            .limit(limit)
            .get();

        const items = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
        } as ItemType));

        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        return {
            success: true,
            message: "Items fetched successfully",
            data: { items, total, page, limit }
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export async function getReceivedDonations({
    query,
    page = 1,
    limit = 8
}: {
    query?: string,
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        
        let queryRef = db.collection('items').where('donatedTo', '==', tokens.decodedToken.uid);

        if (query) {
            queryRef = queryRef.where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff');
        }

        const startAt = (page - 1) * limit;

        const querySnapshot = await queryRef
            .orderBy("donatedOn")
            .startAt(startAt)
            .limit(limit)
            .get();

        const items = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
        } as ItemType));

        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        return {
            success: true,
            message: "Items fetched successfully",
            data: { items, total, page, limit }
        }
        
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export async function getMyRequests({
    query,
    page = 1,
    limit = 8
}: {
    query?: string,
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        let queryRef = db.collection('requests').where('createdBy', '==', tokens.decodedToken.uid).where('status', '==', RequestStatus.PENDING);

        if (query) {
            queryRef = queryRef.where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff');
        }

        const startAt = (page - 1) * limit;

        const querySnapshot = await queryRef
            .orderBy("createdAt")
            .startAt(startAt)
            .limit(limit)
            .get();

        const requests: RequestType[] = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            itemId: doc.data().itemId,
            donorId: doc.data().donorId,
            status: doc.data().status,
            id: doc.id
        }));

        // Fetch items for each request
        const items = await Promise.all(
            requests.map(async (request) => {
                const itemDoc = await db.collection('items').doc(request.itemId).get();
                return {
                    ...itemDoc.data(),
                    id: itemDoc.id
                } as ItemType;
            })
        );

        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        console.log('------------>', items);

        return {
            success: true,
            message: "Items fetched successfully", 
            data: { items, total, page, limit }
        }

    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

/** Size of the pool pulled before in-memory filtering. See note in getListings. */
const LISTINGS_POOL = 300;

export async function getListings({
    query,
    categoryId,
    page = 1,
    limit = 12,
    maxDistanceKm,
}: {
    query?: string;
    /** category id from the chips row */
    categoryId?: string;
    page?: number;
    limit?: number;
    maxDistanceKm?: number;
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        // Try to get user location for proximity sorting
        let userLocation: { lat: number; lng: number } | null = null;
        try {
            const tokens = await getTokens(await cookies(), authConfig);
            if (tokens) userLocation = await getUserLocation(tokens.decodedToken.uid);
        } catch {}

        // One pool, filtered in memory, rather than branching on whether the
        // viewer has a location. Firestore can't do any of what this page needs \u2014
        // case-insensitive substring search, matching a category id inside an
        // array of objects, or distance \u2014 so splitting the work between the query
        // and memory only produced two code paths that behaved differently.
        // A single equality filter also keeps this off any composite index.
        //
        // At the platform's current size the pool covers the whole catalogue. If
        // it outgrows LISTINGS_POOL, search should move to a dedicated index
        // (Algolia/Typesense) rather than a bigger pool.
        const snapshot = await db
            .collection('items')
            .where('donatedTo', '==', null)
            .limit(LISTINGS_POOL)
            .get();

        let items: ItemType[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ItemType));

        // Text search \u2014 substring and case-insensitive across name and description.
        // The previous Firestore range query only matched a case-sensitive prefix
        // of `name`, so "sofa" missed an item titled "Sofa".
        if (query?.trim()) {
            const needle = query.trim().toLowerCase();
            items = items.filter(
                (item) =>
                    item.name?.toLowerCase().includes(needle) ||
                    item.description?.toLowerCase().includes(needle)
            );
        }

        if (categoryId) {
            items = items.filter((item) =>
                item.categories?.some((category) => category?.id === categoryId)
            );
        }

        if (userLocation) {
            items = sortByDistance(items, userLocation.lat, userLocation.lng, maxDistanceKm);
        } else {
            // No location to rank against \u2014 newest first.
            items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        }

        const total = items.length;
        const paginated = items.slice((page - 1) * limit, page * limit);

        return {
            success: true,
            message: "Items fetched successfully",
            data: { items: paginated, total, page, limit },
        };
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return { success: false, message: message, data: null };
    }
}

export async function getWishlist({
    query,
    page = 1,
    limit = 8
}: {
    query?: string,
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    'use server';
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        let queryRef = db.collection('wishlist').where('createdBy', '==', tokens.decodedToken.uid);

        if (query) {
            queryRef = queryRef.where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff');
        }

        const startAt = (page - 1) * limit;

        const querySnapshot = await queryRef
            .orderBy("createdAt")
            .startAt(startAt)
            .limit(limit)
            .get();

        const wishlist = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
        } as WishlistType));

        // Fetch items for each request
        const items = await Promise.all(
            wishlist.map(async (request) => {
                const itemDoc = await db.collection('items').doc(request.itemId).get();
                return {
                    ...itemDoc.data(),
                    id: itemDoc.id
                } as ItemType;
            })
        );

        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        return {
            success: true,
            message: "Items fetched successfully",
            data: { items, total, page, limit }
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export async function getItem(id: string): Promise<ResponseData<ItemType | null>> {
    'use server';
    try {
        const itemDoc = await db.collection('items').doc(id).get();
        // A missing document used to fall through as `{ id }` with every other
        // field undefined, so callers got success:true and a hollow item.
        if (!itemDoc.exists) {
            return { success: false, message: "Item not found", data: null };
        }
        return {
            success: true,
            message: "Item fetched successfully",
            data: {
                ...itemDoc.data(),
                id: itemDoc.id
            } as ItemType
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

export interface PublicListing {
    item: ItemType;
    /** Who is passing it on — an organisation if there is one, else the member. */
    lister: {
        kind: "organisation" | "member";
        name: string;
        /** Storefront slug, organisations only. */
        slug?: string;
        photoUrl?: string;
        verified?: boolean;
        location?: string;
    } | null;
}

/**
 * One listing, with everything a public page needs, resolved server-side.
 *
 * Exists so a listing has a real URL of its own. Sharing `/explore?id=…` works
 * in a browser but previews as the generic explore page — which, on WhatsApp,
 * is most of what a shared link is.
 */
export async function getPublicListing(id: string): Promise<PublicListing | null> {
    'use server';
    try {
        const snap = await db.collection('items').doc(id).get();
        if (!snap.exists) return null;

        const item = { ...(snap.data() as ItemType), id: snap.id };

        // An organisation's listing belongs to the organisation, not to whichever
        // member of staff typed it in.
        if (item.orgId) {
            const org = await db.collection('organisations').doc(item.orgId).get();
            const d = org.data();
            if (d && d.status === 'active') {
                return {
                    item,
                    lister: {
                        kind: 'organisation',
                        name: d.name,
                        slug: d.slug,
                        photoUrl: d.logoUrl || undefined,
                        verified: !!d.verified,
                        location: d.locationName || undefined,
                    },
                };
            }
        }

        if (item.createdBy) {
            const user = await db.collection('users').doc(item.createdBy).get();
            const d = user.data();
            if (d) {
                return {
                    item,
                    lister: {
                        kind: 'member',
                        name: d.name || 'A neighbour',
                        photoUrl: d.profileUrl || undefined,
                        verified: !!d.verified,
                        location: d.preferedLocation || undefined,
                    },
                };
            }
        }

        return { item, lister: null };
    } catch {
        return null;
    }
}

/** Ids and timestamps of available listings, for the sitemap. */
export async function listListingsForSitemap(): Promise<{ id: string; updatedAt: string }[]> {
    'use server';
    try {
        const snap = await db.collection('items')
            .where('donatedTo', '==', null)
            .limit(5000)
            .get();
        return snap.docs.map((d) => ({
            id: d.id,
            updatedAt: (d.data().updatedAt as string) || (d.data().createdAt as string) || new Date().toISOString(),
        }));
    } catch {
        return [];
    }
}
