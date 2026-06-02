import { CategoryType, ItemType, PaginatedData, RequestStatus, RequestType, ResponseData, WishlistType } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { haversineKm } from "@/lib/distance";

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
    const withDist = items.map((item) => ({
        ...item,
        distance:
            item.lat != null && item.lng != null
                ? haversineKm(userLat, userLng, item.lat, item.lng)
                : undefined,
    }));
    if (maxKm != null) {
        withDist.filter((i) => i.distance == null || i.distance <= maxKm);
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

        const docRef = await db.collection('items').add({
            ...item,
            ...locationFields,
            donatedTo: null,
            donatedOn: null,
            views: 0,
            createdBy: tokens.decodedToken.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
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

export async function getPopularItems(): Promise<ResponseData<ItemType[] | null>> {
    'use server';
    try {
        // Try to get user location for proximity sorting
        let userLocation: { lat: number; lng: number } | null = null;
        try {
            const tokens = await getTokens(await cookies(), authConfig);
            if (tokens) userLocation = await getUserLocation(tokens.decodedToken.uid);
        } catch {}

        const snapshot = await db
            .collection('items')
            .where('donatedTo', '==', null)
            .orderBy('views', 'desc')
            .limit(userLocation ? 50 : 8) // fetch more when we have location so we can proximity-sort
            .get();

        let items: ItemType[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ItemType));

        if (userLocation) {
            items = sortByDistance(items, userLocation.lat, userLocation.lng);
            items = items.slice(0, 8);
        }

        return { success: true, message: "Items fetched successfully", data: items };
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

export async function getListings({
    query,
    queryBy = "name",
    page = 1,
    limit = 8,
    maxDistanceKm,
}: {
    query?: string;
    queryBy?: "name" | "condition" | "categories";
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

        let queryRef = db.collection('items').where('donatedTo', '==', null);

        if (query) {
            if (queryBy === "categories") {
                queryRef = queryRef.where(queryBy, 'array-contains', query);
            } else {
                queryRef = queryRef.where(queryBy, '>=', query).where(queryBy, '<=', query + '\uf8ff');
            }
        }

        if (userLocation) {
            // Fetch a large pool so we can sort/filter by distance in memory
            const snapshot = await queryRef.limit(300).get();
            let items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ItemType));

            // Sort by proximity; optionally filter by radius
            items = sortByDistance(items, userLocation.lat, userLocation.lng, maxDistanceKm);

            const total = items.length;
            const paginated = items.slice((page - 1) * limit, page * limit);
            return { success: true, message: "Items fetched successfully", data: { items: paginated, total, page, limit } };
        }

        // Fallback: no location \u2014 use DB-level ordering + pagination
        const startAt = (page - 1) * limit;
        const querySnapshot = await queryRef
            .orderBy(queryBy === "categories" ? "name" : queryBy)
            .startAt(startAt)
            .limit(limit)
            .get();

        const items = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ItemType));
        const totalQuery = await queryRef.count().get();
        const total = totalQuery.data().count;

        return { success: true, message: "Items fetched successfully", data: { items, total, page, limit } };
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