import "server-only";
import {
    createCipheriv, createECDH, createHmac, createPrivateKey, createSign, randomBytes,
} from "crypto";
// Declared in webpush.types so a client component can name the shape without
// importing this server-only module.
import type { PushSubscriptionKeys, WebPushSubscription } from "./webpush.types";


/**
 * The Web Push protocol, spoken directly.
 *
 * This replaces Firebase Cloud Messaging. FCM was a wrapper around exactly this:
 * the browser's own PushManager produces a subscription, and a server delivers
 * to it by POSTing an encrypted body to the endpoint the browser chose. Going
 * direct means no vendor SDK on the client, no second service worker loading
 * Firebase from a CDN, and Safari and Firefox reached the same way as Chrome
 * rather than through a Google service.
 *
 * Two specs, both implemented here:
 *
 *   RFC 8291  payload encryption (aes128gcm)
 *   RFC 8292  VAPID, which identifies the sender to the push service
 *
 * The encryption is the part that is easy to get subtly wrong, and wrong here
 * fails silently — the push service accepts the request and the browser quietly
 * discards a body it cannot decrypt. So `encryptPayload` takes its salt and
 * ephemeral key as optional arguments purely so the RFC's published test vector
 * can be reproduced exactly. See webpush.test.
 */

/** Fixed by RFC 8291. Not tunable. */
const AUTH_INFO = Buffer.from("WebPush: info\0", "utf8");
const CEK_INFO = Buffer.from("Content-Encoding: aes128gcm\0", "utf8");
const NONCE_INFO = Buffer.from("Content-Encoding: nonce\0", "utf8");

/** One record, larger than any notification we send. */
const RECORD_SIZE = 4096;

/** Twelve hours. RFC 8292 caps this at 24; shorter limits the blast radius. */
const VAPID_TTL_SECONDS = 12 * 60 * 60;

function b64urlDecode(input: string): Buffer {
    return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function b64urlEncode(input: Buffer): string {
    return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type { PushSubscriptionKeys, WebPushSubscription };

/** HKDF with SHA-256, in the one-block form every step here needs. */
function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
    const prk = createHmac("sha256", salt).update(ikm).digest();
    const okm = createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest();
    return okm.subarray(0, length);
}

/**
 * Encrypt a payload for one subscription, per RFC 8291.
 *
 * `salt` and `serverKeys` exist only for the test vector. In production both
 * are random per message, which is required — reusing either across messages
 * to the same subscription leaks plaintext.
 */
export function encryptPayload(
    payload: string,
    keys: PushSubscriptionKeys,
    salt: Buffer = randomBytes(16),
    serverPrivateKey?: Buffer
): Buffer {
    const uaPublic = b64urlDecode(keys.p256dh);
    const authSecret = b64urlDecode(keys.auth);

    const ecdh = createECDH("prime256v1");
    if (serverPrivateKey) ecdh.setPrivateKey(serverPrivateKey);
    else ecdh.generateKeys();
    const asPublic = ecdh.getPublicKey();

    const sharedSecret = ecdh.computeSecret(uaPublic);

    // The key derivation is chained: the shared secret and the auth secret
    // produce an IKM that is bound to both parties' public keys, so a message
    // cannot be replayed against a different subscription.
    const keyInfo = Buffer.concat([AUTH_INFO, uaPublic, asPublic]);
    const ikm = hkdf(authSecret, sharedSecret, keyInfo, 32);

    const contentKey = hkdf(salt, ikm, CEK_INFO, 16);
    const nonce = hkdf(salt, ikm, NONCE_INFO, 12);

    // 0x02 marks the last record. A single record is always the last one.
    const padded = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])]);

    const cipher = createCipheriv("aes-128-gcm", contentKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

    // Header: salt(16) | record size(4) | key id length(1) | key id | ciphertext
    const header = Buffer.alloc(21);
    salt.copy(header, 0);
    header.writeUInt32BE(RECORD_SIZE, 16);
    header.writeUInt8(asPublic.length, 20);

    return Buffer.concat([header, asPublic, ciphertext]);
}

/**
 * The VAPID Authorization header: a signed assertion that this server sent it.
 *
 * ES256 signatures must be the raw r||s pair, not the DER wrapping Node
 * produces by default — hence `dsaEncoding`. DER is accepted by nothing here
 * and fails as a generic 401.
 */
export function vapidHeader(endpoint: string, subject: string, publicKey: string, privateKey: string): string {
    const audience = new URL(endpoint).origin;
    const now = Math.floor(Date.now() / 1000);

    const header = b64urlEncode(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
    const claims = b64urlEncode(
        Buffer.from(JSON.stringify({ aud: audience, exp: now + VAPID_TTL_SECONDS, sub: subject }))
    );

    // Node needs the raw 32-byte scalar rebuilt into a key object; a JWK is the
    // least fiddly way in, and the public half is required to construct one.
    const pub = b64urlDecode(publicKey);
    const key = createPrivateKey({
        key: {
            kty: "EC",
            crv: "P-256",
            d: privateKey,
            x: b64urlEncode(pub.subarray(1, 33)),
            y: b64urlEncode(pub.subarray(33, 65)),
        },
        format: "jwk",
    });

    const signature = b64urlEncode(
        createSign("SHA256")
            .update(`${header}.${claims}`)
            .sign({ key, dsaEncoding: "ieee-p1363" })
    );

    return `vapid t=${header}.${claims}.${signature}, k=${publicKey}`;
}

export interface SendResult {
    ok: boolean;
    status: number;
    /** True when the push service says this subscription is dead for good. */
    gone: boolean;
}

/**
 * Deliver one notification.
 *
 * 404 and 410 mean the subscription no longer exists — the app was uninstalled,
 * or site data cleared. Those are reported separately so the caller can drop
 * the record rather than retrying it forever.
 */
export async function sendWebPush(
    subscription: WebPushSubscription,
    payload: string,
    options: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {}
): Promise<SendResult> {
    const { publicKey, privateKey, subject } = vapidKeys();

    const body = encryptPayload(payload, subscription.keys);

    const res = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
            Authorization: vapidHeader(subscription.endpoint, subject, publicKey, privateKey),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: String(options.ttl ?? 86400),
            Urgency: options.urgency ?? "normal",
        },
        body,
    });

    return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

export function vapidConfigured(): boolean {
    return !!process.env.VAPID_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function vapidKeys(): { publicKey: string; privateKey: string; subject: string } {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
        throw new Error("Push is not configured — VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY must be set.");
    }
    // Push services require a contact for the sender. Some reject a bare origin,
    // so mailto is the safe default.
    return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:hello@givny.com" };
}
