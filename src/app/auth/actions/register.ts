'use server';

import {createUserWithEmailAndPassword} from 'firebase/auth';
import {refreshCookiesWithIdToken} from 'next-firebase-auth-edge/lib/next/cookies';
import {cookies, headers} from 'next/headers';
import { getFirebaseAuth } from '@/firebase/auth/firebase';
import { authConfig } from '@/firebase/config/server-config';
import { db } from '@/firebase/init';
import { ResponseData, UserRegisterPayload, UserType } from '@/app/types';
import { FirebaseErrors } from '@/firebase/errors';
import { sendTemplated } from '@/app/app/actions/emailTemplates';
import { acceptMemberInvite } from '@/app/app/actions/memberInvites';

export async function registerUserAction(payload: UserRegisterPayload): Promise<ResponseData<UserType | null>> {
    try {
        const { email, password, name, preferedLocation, preferedCategories, lat, lng, referredBy, inviteToken } = payload;
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

        // Sign them in, which registration was never doing.
        //
        // Creating a Firebase user does not create a session — loginAction has
        // always called this and registration never did, so a new member was
        // pushed to /app with no cookie, bounced back to the sign-in page by
        // the middleware, and had to type the password they had just chosen.
        // Awaited, because the redirect that follows depends on it.
        await refreshCookiesWithIdToken(
            await user.getIdToken(),
            await headers(),
            await cookies(),
            authConfig
        );

        // Not awaited: somebody's account must never fail to be created because
        // a mail server was slow, and the welcome is not worth a second of the
        // signup form spinning.
        void sendTemplated('welcome', email, {
            first_name: (name ?? '').trim().split(/\s+/)[0] || 'there',
        });

        // Closes the loop on an admin's invitation. Not awaited and never
        // throws: whether we can mark a row accepted is our bookkeeping
        // problem, not a reason to fail somebody's signup.
        if (inviteToken) void acceptMemberInvite(inviteToken, user.uid, email);

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