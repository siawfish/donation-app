import "server-only";
import { GoogleAuth } from "google-auth-library";

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
 * If the SDK is ever fixed, this file is the only thing that needs replacing.
 */

const SCOPES = [
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
];

function projectId(): string {
    const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!id) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
    return id;
}

function serviceAccount() {
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
        throw new Error("The Firebase admin service account is not configured on this environment.");
    }
    return { client_email: clientEmail, private_key: privateKey };
}

async function call<T>(path: string, body: unknown): Promise<T> {
    const auth = new GoogleAuth({ credentials: serviceAccount(), scopes: SCOPES });
    const client = await auth.getClient();
    const res = await client.request<T>({
        url: `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/${path}`,
        method: "POST",
        data: body,
    });
    return res.data;
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
        const detail = error?.response?.data?.error?.message ?? error?.message ?? "unknown error";
        // Already gone is the outcome we wanted, so it is not a failure.
        if (String(detail).includes("USER_NOT_FOUND")) return;
        throw new Error(`Could not delete the sign-in account: ${detail}`);
    }
}
