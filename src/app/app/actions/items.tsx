"use server";

import { CategoryType, ItemType, PaginatedData, ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { authConfig } from "@/firebase/config";
import { db } from "@/firebase/init";
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

        let queryRef = db.collection('items').where('createdBy', '==', tokens.decodedToken.uid);

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

        let queryRef = db.collection('requests').where('createdBy', '==', tokens.decodedToken.uid);

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