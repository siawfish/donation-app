"use server";

import { CategoryType, ItemType, PaginatedData, RequestStatus, RequestType, ResponseData, WishlistType } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";

export async function addItem(item: ItemType): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
  
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        const docRef = await db.collection('items').add({
            ...item,
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

export async function getCategories(): Promise<ResponseData<CategoryType[] | null>> {
    try {
        const categories = await db.collection('categories').get();
        const categoriesData = categories.docs.map((doc) => doc.data() as CategoryType);
        return {
            success: true,
            message: "Categories fetched successfully",
            data: categoriesData
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
    try {
        const items = await db.collection('items').where('donatedTo', '==', null).orderBy('views', 'desc').limit(8).get();
        return {
            success: true,
            message: "Items fetched successfully",
            data: items.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id
            } as ItemType))
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
    limit = 8
}:{
    query?: string,
    queryBy?: "name" | "condition" | "categories",
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
    try {
        let queryRef = db.collection('items').where('donatedTo', '==', null);

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

export async function getWishlist({
    query,
    page = 1,
    limit = 8
}: {
    query?: string,
    page?: number,
    limit?: number
}): Promise<ResponseData<PaginatedData<ItemType[]> | null>> {
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