'use server';

import {createUserWithEmailAndPassword} from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase/auth/firebase';
import { db } from '@/firebase/init';
import { ResponseData, UserRegisterPayload, UserType } from '@/app/types';
import { FirebaseErrors } from '@/firebase/errors';

export async function registerUserAction(payload: UserRegisterPayload): Promise<ResponseData<UserType | null>> {
    try {
        const { email, password, name, preferedLocation, preferedCategories, lat, lng, referredBy } = payload;
        const credential = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password
        );
        const user = credential.user;

        // Only credit a referral if the code resolves to a real, different member —
        // the value arrives from a URL, so it can't be trusted as-is.
        let validReferrer: string | undefined;
        if (referredBy && referredBy !== user.uid) {
            const referrerDoc = await db.collection('users').doc(referredBy).get();
            if (referrerDoc.exists) validReferrer = referredBy;
        }

        const dataWithoutPassword: UserType = {
            id: user.uid,
            name,
            email,
            preferedLocation,
            preferedCategories,
            lat: lat ?? 0,
            lng: lng ?? 0,
            ...(validReferrer ? { referredBy: validReferrer } : {}),
            createdAt: credential.user.metadata.creationTime ?? new Date().toISOString(),
            lastLogin: credential.user.metadata.lastSignInTime ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.collection('users').doc(user.uid).set(dataWithoutPassword);
        return {
            success: true,
            message: "User registered successfully",
            data: dataWithoutPassword
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] ?? error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}