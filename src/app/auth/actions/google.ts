'use server';

import { refreshCookiesWithIdToken } from 'next-firebase-auth-edge/lib/next/cookies';
import { cookies, headers } from 'next/headers';
import { db } from '@/firebase/init';
import { authConfig } from '@/firebase/config/server-config';
import { ResponseData, UserType } from '@/app/types';
import { sendTemplated } from '@/app/app/actions/emailTemplates';
import { acceptMemberInvite } from '@/app/app/actions/memberInvites';

/**
 * Finish a Google sign-in.
 *
 * The popup itself has to happen in the browser — Google will not authenticate
 * anyone inside a server action — so the client does that part and posts the
 * resulting ID token here. This turns it into a session cookie and makes sure a
 * profile document exists, which is the half that must not be done from the
 * browser.
 */

interface GoogleResult {
    user: UserType;
    /** True when this is the first time — the caller still needs their area. */
    isNew: boolean;
    /** True when the profile exists but has no location yet. */
    needsLocation: boolean;
}

interface VerifiedToken {
    uid: string;
    email: string;
    name: string;
    picture?: string;
}

/**
 * Check the ID token is genuine, and get the claims out of it.
 *
 * Goes to Google rather than trusting the token's own contents: an ID token
 * arrives from the browser, so decoding it without verification would let
 * anybody sign in as anybody by posting a JSON blob. `accounts:lookup` returns
 * a user only for a token Google itself just issued and has not expired.
 *
 * This is the public endpoint keyed by the web API key, not the admin one —
 * `admin.auth()` does not work in this project (see src/lib/adminAuth.ts).
 */
async function verifyIdToken(idToken: string): Promise<VerifiedToken> {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) throw new Error('Sign-in is not configured on this environment.');

    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        }
    );

    const data = await res.json().catch(() => ({}));
    const account = data?.users?.[0];
    if (!res.ok || !account?.localId) {
        throw new Error('That sign-in could not be verified. Please try again.');
    }

    return {
        uid: account.localId,
        email: account.email ?? '',
        name: account.displayName ?? '',
        picture: account.photoUrl ?? undefined,
    };
}

export async function googleSignInAction(
    idToken: string,
    options: { referredBy?: string; inviteToken?: string } = {}
): Promise<ResponseData<GoogleResult | null>> {
    try {
        if (!idToken) throw new Error('Missing sign-in token.');

        const verified = await verifyIdToken(idToken);
        if (!verified.email) throw new Error('That Google account has no email address on it.');

        // The session first. Everything below is bookkeeping; being signed in
        // is the thing the caller is about to depend on.
        await refreshCookiesWithIdToken(idToken, await headers(), await cookies(), authConfig);

        const ref = db.collection('users').doc(verified.uid);
        const snap = await ref.get();
        const now = new Date().toISOString();

        if (snap.exists) {
            const user = { ...(snap.data() as UserType), id: verified.uid };
            await ref.update({ lastLogin: now });
            return {
                success: true,
                message: 'Signed in',
                data: { user, isNew: false, needsLocation: !user.preferedLocation },
            };
        }

        // Only credit a referral if the code resolves to a real, different
        // member — the value arrives from a URL, so it can't be trusted as-is.
        let validReferrer: string | undefined;
        if (options.referredBy && options.referredBy !== verified.uid) {
            const referrer = await db.collection('users').doc(options.referredBy).get();
            if (referrer.exists) validReferrer = options.referredBy;
        }

        // Location is deliberately left empty rather than guessed. The caller
        // collects and confirms it next, and a profile claiming to know where
        // somebody lives when nobody asked is worse than one that says nothing.
        const user: UserType = {
            id: verified.uid,
            name: verified.name || verified.email.split('@')[0],
            email: verified.email,
            preferedLocation: '',
            preferedCategories: [],
            lat: 0,
            lng: 0,
            ...(verified.picture ? { profileUrl: verified.picture } : {}),
            ...(validReferrer ? { referredBy: validReferrer } : {}),
            createdAt: now,
            lastLogin: now,
            updatedAt: now,
        };
        await ref.set(user);

        void sendTemplated('welcome', user.email, {
            first_name: user.name.trim().split(/\s+/)[0] || 'there',
        });
        if (options.inviteToken) void acceptMemberInvite(options.inviteToken, user.id, user.email);

        return {
            success: true,
            message: 'Account created',
            data: { user, isNew: true, needsLocation: true },
        };
    } catch (error: any) {
        return { success: false, message: error.message ?? 'Google sign-in failed', data: null };
    }
}

/**
 * Save the area a member confirmed after signing in with Google.
 *
 * Separate from the sign-in because the two happen at different moments: the
 * account exists and the session is live before this is called, so a member who
 * closes the tab here is signed up, not stuck half-created.
 */
export async function saveMyLocation(
    lat: number,
    lng: number,
    locationName: string
): Promise<ResponseData<null>> {
    try {
        const { getTokens } = await import('next-firebase-auth-edge');
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error('Unauthorized');

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !locationName.trim()) {
            throw new Error('That location doesn\'t look right.');
        }

        await db.collection('users').doc(tokens.decodedToken.uid).update({
            lat,
            lng,
            preferedLocation: locationName.trim().slice(0, 120),
            updatedAt: new Date().toISOString(),
        });

        return { success: true, message: 'Location saved', data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
