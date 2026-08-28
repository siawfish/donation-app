import { NextResponse } from "next/server";
import { db } from "@/firebase/init";

/**
 * Records that a campaign email was opened, then returns a 1×1 pixel.
 *
 * Only the FIRST open is stamped. Mail clients re-fetch images when a message
 * is scrolled back to, and counting those would turn one reader into ten.
 *
 * Open tracking is an estimate and always will be: Apple Mail Privacy
 * Protection pre-fetches images for everyone who has it on, and clients that
 * block images report nothing at all. Treat the number as a trend, and trust
 * clicks when the difference matters.
 */

const PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

function pixel() {
    return new NextResponse(PIXEL, {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Content-Length": String(PIXEL.length),
            // Without this the client caches the pixel and later opens vanish.
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            Pragma: "no-cache",
        },
    });
}

export async function GET(
    _request: Request,
    { params }: { params: { sendId: string } }
) {
    try {
        const ref = db.collection("campaignSends").doc(params.sendId);
        const snap = await ref.get();
        if (snap.exists && !snap.data()?.openedAt) {
            await ref.update({ openedAt: new Date().toISOString() });
        }
    } catch {
        // A tracking failure must never stop the image returning — a broken
        // pixel shows as a missing-image icon in the middle of the mail.
    }
    return pixel();
}
