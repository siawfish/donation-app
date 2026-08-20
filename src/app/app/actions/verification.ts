'use server';

import { createHash } from "crypto";
import { db, getFirebaseAdminApp } from "@/firebase/init";
import { getStorage } from "firebase-admin/storage";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { FirebaseErrors } from "@/firebase/errors";
import { ResponseData } from "@/app/types";
import {
    VerificationRecord,
    VerificationStatus,
    cardLast4,
    isValidCardNumber,
    normaliseCardNumber,
} from "@/lib/verification";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import { can } from "@/lib/roles";

const COLLECTION = "verifications";

async function requireUser() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    return tokens;
}

/**
 * Reviewing is a capability of the admin role system, not a separate flag —
 * this originally read a Firebase custom claim, which would have left two
 * competing definitions of "admin" once roles existed.
 */
async function requireReviewer() {
    const tokens = await requireUser();
    const role = await getMyAdminRole();
    if (!can(role, "verifications.review")) throw new Error("Not permitted");
    return tokens;
}

/**
 * Hashed, never stored in the clear. Salted with the project id so the digest
 * isn't reusable against a rainbow table of all ~30M possible Ghana Card numbers
 * — the keyspace is small enough that an unsalted hash would be trivially
 * reversible.
 */
function hashCardNumber(cardNumber: string): string {
    const salt = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "givny";
    return createHash("sha256").update(`${salt}:${normaliseCardNumber(cardNumber)}`).digest("hex");
}

async function deleteStoredImage(imagePath?: string) {
    if (!imagePath) return;
    try {
        await getStorage(getFirebaseAdminApp())
            .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
            .file(imagePath)
            .delete();
    } catch {
        /* already gone, or never written — nothing useful to do */
    }
}

/** Current member's verification state. */
export async function getMyVerification(): Promise<ResponseData<VerificationRecord | null>> {
    try {
        const tokens = await requireUser();
        const snap = await db.collection(COLLECTION).doc(tokens.decodedToken.uid).get();
        return {
            success: true,
            message: "ok",
            data: snap.exists ? ({ ...snap.data(), uid: snap.id } as VerificationRecord) : null,
        };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

/**
 * Submit a Ghana Card for review. `imagePath` is the Storage object the client
 * has already uploaded; the plaintext card number arrives here, is hashed, and
 * is never written anywhere.
 */
export async function submitVerification({
    cardNumber,
    imagePath,
}: {
    cardNumber: string;
    imagePath: string;
}): Promise<ResponseData<VerificationRecord | null>> {
    try {
        const tokens = await requireUser();
        const uid = tokens.decodedToken.uid;

        if (!isValidCardNumber(cardNumber)) {
            throw new Error("That doesn't look like a Ghana Card number. It should read GHA-123456789-0.");
        }
        if (!imagePath.startsWith(`verifications/${uid}/`)) {
            // Stops a caller pointing the record at someone else's object.
            throw new Error("Invalid upload reference.");
        }

        const existing = await db.collection(COLLECTION).doc(uid).get();
        const current = existing.data() as VerificationRecord | undefined;
        if (current?.status === "verified") {
            throw new Error("You're already verified.");
        }
        if (current?.status === "pending") {
            throw new Error("You already have a submission under review.");
        }

        const cardHash = hashCardNumber(cardNumber);

        // One card, one account.
        const clash = await db.collection(COLLECTION).where("cardHash", "==", cardHash).get();
        if (clash.docs.some((d) => d.id !== uid)) {
            throw new Error("This Ghana Card is already linked to another Givny account.");
        }

        // Replace any image left over from a previous rejected attempt.
        await deleteStoredImage(current?.imagePath);

        const record: VerificationRecord = {
            uid,
            status: "pending",
            submittedAt: new Date().toISOString(),
            imagePath,
            cardHash,
            cardLast4: cardLast4(cardNumber),
        };

        await db.collection(COLLECTION).doc(uid).set(record);
        return { success: true, message: "Submitted for review", data: record };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

/** Queue for reviewers. */
export async function listPendingVerifications(): Promise<ResponseData<VerificationRecord[]>> {
    try {
        await requireReviewer();
        const snap = await db.collection(COLLECTION).where("status", "==", "pending").get();
        const rows = snap.docs.map((d) => ({ ...d.data(), uid: d.id } as VerificationRecord));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: [] };
    }
}

/** Short-lived link so a reviewer can see the card without it being public. */
export async function getVerificationImageUrl(uid: string): Promise<ResponseData<string | null>> {
    try {
        await requireReviewer();
        const snap = await db.collection(COLLECTION).doc(uid).get();
        const record = snap.data() as VerificationRecord | undefined;
        if (!record?.imagePath) throw new Error("No image on this submission.");

        const [url] = await getStorage(getFirebaseAdminApp())
            .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
            .file(record.imagePath)
            .getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });

        return { success: true, message: "ok", data: url };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

/**
 * Approve or reject. Either way the ID image is destroyed — there is no reason
 * to keep a national ID scan once a human has looked at it.
 */
export async function reviewVerification({
    uid,
    approve,
    reason,
}: {
    uid: string;
    approve: boolean;
    reason?: string;
}): Promise<ResponseData<null>> {
    try {
        const reviewer = await requireReviewer();
        const ref = db.collection(COLLECTION).doc(uid);
        const snap = await ref.get();
        const record = snap.data() as VerificationRecord | undefined;
        if (!record) throw new Error("No submission found.");

        const status: VerificationStatus = approve ? "verified" : "rejected";
        const reviewedAt = new Date().toISOString();

        await Promise.all([
            ref.update({
                status,
                reviewedAt,
                reviewedBy: reviewer.decodedToken.uid,
                rejectionReason: approve ? "" : reason ?? "",
                // The record keeps the hash (for reuse detection) but loses the
                // pointer to the image, which is deleted below.
                imagePath: "",
            }),
            // Only a flag and a date land on the profile.
            db.collection("users").doc(uid).set(
                approve
                    ? { verified: true, verifiedAt: reviewedAt }
                    : { verified: false },
                { merge: true }
            ),
        ]);

        await deleteStoredImage(record.imagePath);

        return { success: true, message: approve ? "Member verified" : "Submission rejected", data: null };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}
