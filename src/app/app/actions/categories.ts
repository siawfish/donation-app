import { CategoryType, ItemType, ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { getDepartments } from "@/lib/categoryTree";

/**
 * The departments a listing can actually be tagged under (Women, Men,
 * Electronics & Tech, and so on) — the same tree `CategoryPicker` drills into
 * when listing an item. These drive every "browse by category" chip (hero,
 * home strip, explore filters), so a filter can never point at a bucket a
 * listing was never tagged into: they're the same source, not two lists that
 * happen to be kept in sync by hand.
 */
export async function getCategories(): Promise<ResponseData<CategoryType[] | null>> {
    'use server';
    try {
        const categoriesData = getDepartments().map((dept) => ({ id: dept.id, name: dept.name }));
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
        // Rank at the database rather than pulling the whole items collection and
        // sorting in memory. 100 most-viewed items is plenty to surface a handful
        // of trending categories.
        const items = await db
            .collection('items')
            .orderBy('views', 'desc')
            .limit(100)
            .get();

        // Deduplicate — an item carries several categories and categories repeat
        // across items, so the raw flatMap is full of duplicates.
        const seen = new Set<string>();
        const categories: CategoryType[] = [];
        for (const doc of items.docs) {
            for (const category of (doc.data() as ItemType).categories ?? []) {
                if (!category?.id || seen.has(category.id)) continue;
                seen.add(category.id);
                categories.push(category);
            }
        }

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