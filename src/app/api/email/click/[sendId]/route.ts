import { NextResponse } from "next/server";
import { db } from "@/firebase/init";
import { siteUrl } from "@/lib/seo";

/**
 * Records a click, then forwards to the campaign's own call to action.
 *
 * The destination is looked up from the campaign rather than taken from the
 * URL. A redirect that forwards to whatever a query parameter says is an open
 * redirect, and one sitting on our domain in an email is exactly the thing a
 * phisher would want.
 */
export async function GET(
    _request: Request,
    { params }: { params: { sendId: string } }
) {
    const fallback = `${siteUrl()}/explore`;

    try {
        const sendRef = db.collection("campaignSends").doc(params.sendId);
        const send = await sendRef.get();
        if (!send.exists) return NextResponse.redirect(fallback);

        if (!send.data()?.clickedAt) {
            const now = new Date().toISOString();
            // A click proves the mail was opened, whether or not the pixel
            // ever loaded — so it backfills the open too.
            await sendRef.update({
                clickedAt: now,
                ...(send.data()?.openedAt ? {} : { openedAt: now }),
            });
        }

        const campaign = await db.collection("campaigns").doc(send.data()!.campaignId).get();
        const target = campaign.data()?.ctaUrl;
        if (typeof target === "string" && /^https?:\/\//i.test(target)) {
            return NextResponse.redirect(target);
        }
        return NextResponse.redirect(fallback);
    } catch {
        return NextResponse.redirect(fallback);
    }
}
