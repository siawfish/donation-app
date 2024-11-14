'use server';

import {createUserWithEmailAndPassword} from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase/auth/firebase';
import { db } from '@/firebase/init';
import { DonorType, DonorRegisterPayload, ResponseData, UserRegisterPayload, UserType, UserTypes } from '@/app/types';
import { FirebaseErrors } from '@/firebase/errors';

export async function registerDonorAction(payload: DonorRegisterPayload): Promise<ResponseData<DonorType | null>> {
    try {
        const {email, password, ...donorData} = payload;
        const credential = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password
        );
        const user = credential.user;
        const dataWithoutPassword = {
            ...donorData,
            email,
            id: user.uid,
            userType: UserTypes.DONOR,
            createdAt: credential.user.metadata.creationTime ?? new Date().toISOString(),
            lastLogin: credential.user.metadata.lastSignInTime ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.collection('users').doc(user.uid).set(dataWithoutPassword);
        return {
            success: true,
            message: "Donor registered successfully",
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

export async function registerUserAction(payload: UserRegisterPayload): Promise<ResponseData<UserType | null>> {
    try {
        const {email, password, ...userData} = payload;
        const credential = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password
        );
        const user = credential.user;
        const dataWithoutPassword = {
            ...userData,
            email,
            id: user.uid,
        }
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