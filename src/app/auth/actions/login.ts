'use server';

import {signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {refreshCookiesWithIdToken} from 'next-firebase-auth-edge/lib/next/cookies';
import {cookies, headers} from 'next/headers';
import { getFirebaseAuth } from '@/firebase/auth/firebase';
import { authConfig } from '@/firebase/config';
import { DonorType, ResponseData, UserType } from '@/app/types';
import { FirebaseErrors } from '@/firebase/errors';
import { db } from '@/firebase/init';

export async function loginAction(email: string, password: string): Promise<ResponseData<UserType | DonorType | null>> {
    try {
        const credential = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password
        );
    
        const idToken = await credential.user.getIdToken();
        const [_, loggedInUser] = await Promise.all([refreshCookiesWithIdToken(
            idToken,
            await headers(),
            await cookies(),
            authConfig
        ), getUserByUid(credential.user.uid)]);
        if (!loggedInUser) {
            await signOut(getFirebaseAuth());
            throw new Error("User not found");
        }
        updateUserLastLogin(credential.user.uid, credential.user.metadata.lastSignInTime ?? new Date().toISOString());
        return {
            success: true,
            message: "Login successful",
            data: loggedInUser
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message || "Login failed";
        return {
            success: false,
            message: message,
            data: null
        }
    }
}

async function getUserByUid(uid: string): Promise<UserType | DonorType | null> {
    const user = await db.collection('users').doc(uid).get();
    return user.data() as UserType | DonorType | null;
}

async function updateUserLastLogin(uid: string, lastLogin: string) {
    await db.collection('users').doc(uid).update({
        lastLogin: lastLogin
    });
}