import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/firebase/auth/firebase";
import { awaitClientAuth } from "@/firebase/auth/clientAuth";

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/heic",
    "image/heif",
    "image/svg+xml",
];

export function isAcceptedImage(file: File): boolean {
    // Some browsers report an empty type for HEIC; fall back to the extension.
    if (file.type) return IMAGE_TYPES.includes(file.type);
    return /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
}

export function imageRejectionReason(file: File): string | null {
    if (!isAcceptedImage(file)) return "That file isn't an image we can use.";
    if (file.size === 0) return "That file is empty.";
    if (file.size > IMAGE_MAX_BYTES) return "That image is over 8 MB.";
    return null;
}

/**
 * Upload an image for a post and return its public URL.
 *
 * Blog images are public by definition — they appear on published pages and in
 * link previews — so they live under a readable prefix. Writing is restricted
 * to the uploader's own folder by the storage rules.
 */
export async function uploadBlogImage(
    file: File,
    onProgress?: (percent: number) => void
): Promise<string> {
    const reason = imageRejectionReason(file);
    if (reason) throw new Error(reason);

    // Storage rules check the *client* SDK's user, which signs in with a custom
    // token after mount. Without this the first upload after a page load can
    // race that and come back as storage/unauthorized.
    const user = await awaitClientAuth();
    if (!user) throw new Error("Couldn't verify your session. Refresh the page and try again.");

    // Object names choke on spaces and non-ASCII, and two images picked in the
    // same millisecond would otherwise collide.
    const safe = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-56);
    const path = `blog/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;

    const task = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type || "image/jpeg",
    });

    await new Promise<void>((resolve, reject) => {
        task.on(
            "state_changed",
            (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            () => resolve()
        );
    });

    return getDownloadURL(task.snapshot.ref);
}
