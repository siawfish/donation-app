'use server';

import {createUserWithEmailAndPassword} from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase/auth/firebase';
import { db } from '@/firebase/init';
import { ResponseData, UserRegisterPayload, UserType } from '@/app/types';
import { FirebaseErrors } from '@/firebase/errors';

export async function registerUserAction(payload: UserRegisterPayload): Promise<ResponseData<UserType | null>> {
    try {
        const { email, password, name, preferedLocation, preferedCategories, lat, lng } = payload;
        const credential = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password
        );
        const user = credential.user;
        const dataWithoutPassword: UserType = {
            id: user.uid,
            name,
            email,
            preferedLocation,
            preferedCategories,
            lat: lat ?? 0,
            lng: lng ?? 0,
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