"use server";

import { ActivityType, PaginatedData, ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";

export async function recordActivity(activity: ActivityType): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        const docRef = await db.collection('activities').add({
            ...activity,
            createdBy: tokens.decodedToken.uid,
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return {
            success: true,
            message: "Activity recorded successfully",
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

export async function getActivities(page: number = 1, limit: number = 10): Promise<ResponseData<PaginatedData<ActivityType[]> | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        const startAt = (page - 1) * limit;
        
        const query = db.collection('activities')
            .where('userId', '==', tokens.decodedToken.uid)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset(startAt);

        const [querySnapshot, totalDocs] = await Promise.all([
            query.get(),
            db.collection('activities')
                .where('userId', '==', tokens.decodedToken.uid)
                .count()
                .get()
        ]);

        const activities = querySnapshot.docs.map((doc) => doc.data() as ActivityType);

        return {
            success: true,
            message: "Activities fetched successfully",
            data: {
                items: activities,
                total: totalDocs.data().count,
                page,
                limit
            }
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