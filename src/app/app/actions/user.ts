"use server";

import { ResponseData, UserType } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { db, getFirebaseAdminApp } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { updatePassword } from 'firebase/auth';
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import { getAuth } from "firebase-admin/auth";

export async function updateUserProfile(user: UserType): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        const userRef = db.collection('users').doc(tokens.decodedToken.uid);
        
        // update firebase auth user
        await userRef.update({
            ...user,
            updatedAt: new Date().toISOString()
        })
        
        return {
            success: true,
            message: "Profile updated successfully",
            data: null
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

/**
 * Mints a fresh custom token for the signed-in user's own browser SDK.
 *
 * AuthProvider signs the client in with the custom token baked into the
 * first page load, at the root layout — which doesn't re-run its own data
 * fetch on client-side navigation, so that token can go stale over a
 * long-lived tab with nothing to refresh it. Anything that hit
 * "couldn't verify your session" can call this and sign in again, rather
 * than asking the person to reload the page.
 */
export async function getFreshCustomToken(): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        const customToken = await getAuth(getFirebaseAdminApp()).createCustomToken(tokens.decodedToken.uid);

        return {
            success: true,
            message: "Token refreshed",
            data: customToken
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

export async function changePassword(oldPassword: string, newPassword: string): Promise<ResponseData<string | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) {
            throw new Error('Unauthorized');
        }

        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        // Update to new password
        await updatePassword(currentUser, newPassword);

        return {
            success: true,
            message: "Password updated successfully",
            data: null
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