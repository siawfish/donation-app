/**
 * The subscription shape, shared by client and server.
 *
 * Kept apart from `webpush.ts` because that module is server-only — it imports
 * `crypto` and is marked `server-only`, so a client component importing the
 * type from there would drag the whole thing into the bundle and fail the
 * build.
 */

export interface PushSubscriptionKeys {
    /** The browser's public key, uncompressed P-256 point, base64url. */
    p256dh: string;
    /** The browser's auth secret, 16 bytes, base64url. */
    auth: string;
}

export interface WebPushSubscription {
    endpoint: string;
    keys: PushSubscriptionKeys;
}
