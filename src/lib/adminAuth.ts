import "server-only";
import { createSign } from "crypto";

/**
 * Firebase Auth admin operations, over REST rather than the Admin SDK.
 *
 * `admin.auth()` does not work in this project. Given the very same service
 * account that Firestore accepts, it fails to mint a token:
 *
 *     app/invalid-credential — "The incoming JSON object does not contain a
 *     client_email field"
 *
 * The Identity Toolkit REST API accepts that credential without complaint, so
 * everything here goes through it directly. This is the same workaround the
 * Firestore rules deployment uses, and the reason `src/lib/roles.ts` keeps
 * admin roles in a document instead of a custom claim.
 *
 * The OAuth2 handshake is done by hand rather than with `google-auth-library`.
 * It is a signed JWT posted to a token endpoint — about thirty lines — and the
 * library was a second copy of a package `firebase-admin` already depends on,
 * for one call. Node's `crypto` and `fetch` cover it.
 *
 * If the SDK is ever fixed, this file is the only thing that needs replacing.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

/** One hour is the maximum Google allows, and the longest useful. */
const TOKEN_TTL_SECONDS = 3600;

/**
 * Re-minting a token per request would add a round trip to Google in front of
 * every call. Renewed a minute early so a token can never expire in flight.
 */
const RENEW_MARGIN_MS = 60_000;

let cached: { token: string; expiresAt: number } | null = null;

function projectId(): string {
    const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!id) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
    return id;
}

function serviceAccount(): { clientEmail: string; privateKey: string } {
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
        throw new Error("The Firebase admin service account is not configured on this environment.");
    }
    return { clientEmail, privateKey };
}

/** JWTs use base64url, which is base64 with two characters swapped and no padding. */
function base64url(input: string | Buffer): string {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/** A service-account assertion: the JWT Google exchanges for an access token. */
function signedAssertion(): string {
    const { clientEmail, privateKey } = serviceAccount();
    const now = Math.floor(Date.now() / 1000);

    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
        JSON.stringify({
            iss: clientEmail,
            scope: SCOPES,
            aud: TOKEN_URL,
            iat: now,
            exp: now + TOKEN_TTL_SECONDS,
        })
    );

    const signature = base64url(
        createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey)
    );

    return `${header}.${claims}.${signature}`;
}

async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - RENEW_MARGIN_MS > Date.now()) return cached.token;

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signedAssertion(),
        }),
    });

    const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
    if (!res.ok || !data.access_token) {
        throw new Error(`Could not authenticate with Google: ${data.error_description ?? data.error ?? res.statusText}`);
    }

    cached = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? TOKEN_TTL_SECONDS) * 1000,
    };
    return cached.token;
}

async function call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/${path}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${await accessToken()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as any)?.error?.message ?? res.statusText;
        throw new Error(String(detail));
    }
    return data as T;
}

export interface AuthAccount {
    localId: string;
    email?: string;
    disabled?: boolean;
    createdAt?: string;
}

/** The sign-in account for an email address, or null if nobody has one. */
export async function findAuthUserByEmail(email: string): Promise<AuthAccount | null> {
    try {
        const data = await call<{ users?: AuthAccount[] }>("accounts:lookup", { email: [email] });
        return data.users?.[0] ?? null;
    } catch {
        // Only ever used to decide whether an invitation is worth sending. A
        // lookup failure should not stop an admin inviting somebody.
        return null;
    }
}

/**
 * Delete a sign-in account for good.
 *
 * Throws on failure, deliberately: the caller deletes the member's data next,
 * and data removed while the account still signs in leaves somebody logged into
 * a profile that no longer exists.
 */
export async function deleteAuthUser(uid: string): Promise<void> {
    try {
        await call("accounts:delete", { localId: uid });
    } catch (error: any) {
        const detail = error?.message ?? "unknown error";
        // Already gone is the outcome we wanted, so it is not a failure.
        if (String(detail).includes("USER_NOT_FOUND")) return;
        throw new Error(`Could not delete the sign-in account: ${detail}`);
    }
}
