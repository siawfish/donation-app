'use server';

/**
 * One-to-one candidate email — built on the exact same pieces `campaigns.ts`
 * sends bulk mail through (merge tags, the branded shell, the provider
 * abstraction), just aimed at a single application rather than a resolved
 * audience. See candidateMessages.ts for why this carries no unsubscribe
 * link or open tracking.
 */

import { db } from "@/firebase/init";
import { ResponseData } from "@/app/types";
import { JobApplication } from "@/lib/jobs";
import {
    CandidateMessage, CandidateMessagePurpose, SenderMode,
    validateCandidateMessage, candidateContext,
} from "@/lib/candidateMessages";
import { renderMergeTags } from "@/lib/campaigns";
import { renderCampaignEmail, renderCampaignText } from "@/lib/email/template";
import { sendEmail, CAREERS_REPLYABLE_FROM, CAREERS_NO_REPLY_FROM } from "@/lib/email/provider";
import { siteUrl } from "@/lib/seo";
import { requireJobsAdmin, actorName } from "./jobs";
import { recordAudit } from "./audit";

const APPLICATIONS = "jobApplications";
const MESSAGES = "applicationMessages";

const iso = () => new Date().toISOString();

export async function listApplicationMessages(applicationId: string): Promise<ResponseData<CandidateMessage[]>> {
    try {
        await requireJobsAdmin("applications.manage");
        const snap = await db.collection(MESSAGES).where("applicationId", "==", applicationId).get();
        const rows = snap.docs.map((d) => ({ ...(d.data() as CandidateMessage), id: d.id }));
        rows.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function sendCandidateMessage(input: {
    applicationId: string;
    purpose: CandidateMessagePurpose;
    subject: string;
    body: string;
    senderMode: SenderMode;
}): Promise<ResponseData<CandidateMessage | null>> {
    try {
        const { uid } = await requireJobsAdmin("applications.manage");

        const problem = validateCandidateMessage(input);
        if (problem) throw new Error(problem);

        const appSnap = await db.collection(APPLICATIONS).doc(input.applicationId).get();
        if (!appSnap.exists) throw new Error("Application not found");
        const application = appSnap.data() as JobApplication;

        const ctx = candidateContext(application.name, application.jobTitle ?? "");

        const subject = renderMergeTags(input.subject, ctx);
        const bodyMarkdown = renderMergeTags(input.body, ctx);

        const html = renderCampaignEmail({
            subject,
            bodyMarkdown,
            siteUrl: siteUrl(),
            // No unsubscribeUrl, no openPixelUrl: this is a reply someone is
            // owed for applying, not marketing they can opt out of.
        });
        const text = renderCampaignText({ subject, bodyMarkdown, siteUrl: siteUrl() });

        const from = input.senderMode === "no_reply" ? CAREERS_NO_REPLY_FROM : CAREERS_REPLYABLE_FROM;
        const result = await sendEmail({ to: application.email, subject, html, text, from });

        const sentByName = await actorName(uid);
        const record: CandidateMessage = {
            applicationId: input.applicationId,
            jobId: application.jobId,
            jobTitle: application.jobTitle,
            to: application.email,
            purpose: input.purpose,
            subject,
            body: bodyMarkdown,
            senderMode: input.senderMode,
            status: result.ok ? "sent" : "failed",
            ...(result.ok ? {} : { reason: result.error ?? "The provider refused it." }),
            sentBy: uid,
            sentByName,
            sentAt: iso(),
        };
        const ref = await db.collection(MESSAGES).add(record);

        if (!result.ok) throw new Error(record.reason);

        await recordAudit({
            action: "application.message",
            targetId: input.applicationId,
            targetLabel: `${application.name} · ${application.jobTitle ?? ""}`.trim(),
            detail: `${input.purpose} message via ${input.senderMode === "no_reply" ? "no-reply" : "careers"}`,
        });

        // No revalidatePath here — unlike a stage change, nothing this
        // affects is server-rendered on the jobs page (the pipeline reads its
        // own rows client-side), and revalidating would remount the pipeline
        // and close this dialog out from under whoever just sent the message.
        return {
            success: true,
            message: result.provider === "dry-run"
                ? "No provider configured — nothing was actually delivered, but it's logged as sent."
                : `Sent to ${application.email}`,
            data: { ...record, id: ref.id },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
