/**
 * Ghana Card verification helpers.
 *
 * Privacy position, which drives the whole design:
 *
 *  - The card image is held only until a reviewer makes a decision, then it is
 *    deleted. Givny has no reason to retain scans of national ID documents, and
 *    every day one is kept is a day it can leak.
 *  - The card number is never stored. It is hashed server-side so the same card
 *    cannot silently verify several accounts, and the plaintext is discarded.
 *  - What survives on the user is a boolean, a timestamp, and nothing else.
 *
 * Ghana's Data Protection Act 2012 (Act 843) treats this as personal data, so
 * "collect the minimum, keep it the shortest time" is a legal posture as well as
 * a technical one.
 */

/** Ghana Card PIN format, e.g. GHA-123456789-0 */
const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/;

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface VerificationRecord {
    uid: string;
    status: VerificationStatus;
    submittedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    /** Storage path of the ID image — cleared once a decision is made. */
    imagePath?: string;
    /** SHA-256 of the normalised card number. Detects reuse without keeping it. */
    cardHash?: string;
    rejectionReason?: string;
    /** Display only, so the member can tell which card they submitted. */
    cardLast4?: string;
}

/** Uppercase, strip spaces, tolerate a missing "GHA-" prefix. */
export function normaliseCardNumber(input: string): string {
    let value = input.trim().toUpperCase().replace(/\s+/g, "");
    if (/^\d{9}-?\d$/.test(value)) value = `GHA-${value}`;
    // Accept GHA1234567890 by re-inserting the separators
    const bare = /^GHA-?(\d{9})-?(\d)$/.exec(value);
    if (bare) return `GHA-${bare[1]}-${bare[2]}`;
    return value;
}

export function isValidCardNumber(input: string): boolean {
    return GHANA_CARD_PATTERN.test(normaliseCardNumber(input));
}

/** Last four characters, for "the card ending 789-0" style confirmation. */
export function cardLast4(input: string): string {
    const n = normaliseCardNumber(input);
    return n.slice(-4);
}

/** Copy for each state — kept in one place so the badge and the settings card agree. */
export const STATUS_COPY: Record<VerificationStatus, { label: string; blurb: string }> = {
    unverified: {
        label: "Not verified",
        blurb: "Verify your identity once to earn a badge people can trust.",
    },
    pending: {
        label: "Under review",
        blurb: "We're checking your details. This usually takes less than a day.",
    },
    verified: {
        label: "Verified",
        blurb: "Your identity is confirmed. Your badge is visible across Givny.",
    },
    rejected: {
        label: "Couldn't verify",
        blurb: "We couldn't confirm your details. You can submit again.",
    },
};
