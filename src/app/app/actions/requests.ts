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
        // Carry the organisation down from the item, so an organisation's
        // responsiveness can be counted without reading every one of its
        // listings back. Read server-side: a client could otherwise credit
        // someone else's organisation.
        const itemSnap = await db.collection('items').doc(request.itemId).get();
        const orgId = itemSnap.data()?.orgId ?? null;

        const docRef = await db.collection('requests').add({
            ...request,
            ...(orgId ? { orgId } : {}),
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

