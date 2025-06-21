import { CategoryType, ItemType, ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";

export async function getCategories(): Promise<ResponseData<CategoryType[] | null>> {
    'use server';
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

export async function getTrendingCategories(): Promise<ResponseData<CategoryType[] | null>> {
    'use server';
    try {
        const items = await db.collection('items').get();
        const itemsData = items.docs.map((doc) => doc.data() as ItemType);
        // sort categories by views
        const sortedItems = itemsData.sort((a, b) => {
            const aViews = a.views || 0;
            const bViews = b.views || 0;
            return bViews - aViews;
        });
        const categories = sortedItems.map((item) => item.categories).flat();
        return {
            success: true,
            message: "Trending categories fetched successfully",
            data: categories
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