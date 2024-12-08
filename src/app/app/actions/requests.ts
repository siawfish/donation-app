"use server";

import { ActivityAction, RequestType, ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { recordActivity } from "./activities";

export async function sendRequest(request: RequestType): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }
        const docRef = await db.collection('requests').add({
            ...request,
            createdBy: tokens.decodedToken.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        recordActivity({
            recipientId: request.donorId,
            action: ActivityAction.ITEM_REQUESTED,
            itemId: request.itemId,
            requestId: docRef.id
        });
        // send email to donor
        // send push notification to donor
        return {
            success: true,
            message: "Request sent successfully",
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

