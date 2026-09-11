/**
 * Candidate messaging — the same system campaigns are built on, pointed at
 * one person instead of a segment.
 *
 * A campaign is marketing: it needs an audience, an unsubscribe link, and
 * open/click tracking because nobody asked for it. A message to a candidate
 * is transactional — they applied, so they're owed a reply — which is why it
 * carries neither. What it does share with campaigns is everything else:
 * `{{tag}}` merge tags rendered the same way, the same markdown body, the
 * same branded shell (`renderCampaignEmail`/`renderCampaignText`), and the
 * same shape of editor (a starting draft, a live preview, a send button that
 * can't be pressed twice).
 *
 * The starting draft for each purpose is not written here — it's one of the
 * "careers" templates in `email/templates.ts`, editable from Admin → Email
 * templates the same way every other transactional mail is. That's the
 * whole point of routing through the template system rather than a fixed
 * preset in this file: an admin fixing the interview-invite wording there is
 * fixing what the messenger fills in next time, not a second copy of it.
 */

import { tagsUsed, renderMergeTags } from "./campaigns";
import type { TemplateKey } from "./email/templates";

export type CandidateMessagePurpose = "acknowledge" | "rejection" | "interview" | "offer" | "other";

export const PURPOSE_LABELS: Record<CandidateMessagePurpose, string> = {
    acknowledge: "Acknowledge receipt",
    rejection: "Rejection",
    interview: "Interview invitation",
    offer: "Offer",
    other: "Other",
};

/** Which careers template backs each purpose in the composer's dropdown. */
export const PURPOSE_TEMPLATE_KEY: Record<CandidateMessagePurpose, TemplateKey> = {
    acknowledge: "candidate_acknowledge",
    rejection: "candidate_rejection",
    interview: "candidate_interview",
    offer: "candidate_offer",
    other: "candidate_other",
};

/** Who a reply would actually reach. */
export type SenderMode = "replyable" | "no_reply";

export const SENDER_MODE_LABELS: Record<SenderMode, string> = {
    replyable: "Replyable — careers@givny.com",
    no_reply: "No-reply — informational only",
};

/**
 * A message sent to one candidate. Stored per-send, the same way a campaign
 * keeps one row per recipient — so "what did we already tell this person"
 * has a real answer instead of relying on someone's memory of a mail thread.
 */
export interface CandidateMessage {
    id?: string;
    applicationId: string;
    jobId: string;
    jobTitle?: string;
    to: string;
    purpose: CandidateMessagePurpose;
    subject: string;
    body: string;
    senderMode: SenderMode;
    status: "sent" | "failed";
    reason?: string;
    sentBy: string;
    sentByName?: string;
    sentAt: string;
}

/** What a message may say about the candidate it's going to. Small on purpose — see campaigns.ts. */
export interface CandidateMergeContext {
    // Lets a concrete value pass straight into renderMergeTags, shared with
    // campaigns.ts, which takes a plain string map rather than this interface.
    [key: string]: string;
    first_name: string;
    job_title: string;
}

export const CANDIDATE_MERGE_TAGS: { tag: keyof CandidateMergeContext; label: string; example: string }[] = [
    { tag: "first_name", label: "First name", example: "Ama" },
    { tag: "job_title", label: "Role applied for", example: "Product Designer" },
];

/** Any `{{tag}}` this message doesn't know how to fill — it would ship as literal braces. */
export function unknownCandidateTags(text: string): string[] {
    const known = new Set(CANDIDATE_MERGE_TAGS.map((t) => t.tag as string));
    return tagsUsed(text).filter((t) => !known.has(t));
}

/**
 * What the editor shows as "how it reads" — the real candidate's name and
 * the real role, not a stand-in. Pure and synchronous so it can run on every
 * keystroke without a round trip; the server re-renders the same way at
 * send time using this exact function's counterpart context.
 */
export function candidateContext(candidateName: string, jobTitle: string): CandidateMergeContext {
    return {
        first_name: (candidateName ?? "").trim().split(/\s+/)[0] || "there",
        job_title: jobTitle || "the role",
    };
}

export function renderCandidatePreview(
    subject: string,
    body: string,
    candidateName: string,
    jobTitle: string
): { subject: string; body: string } {
    const ctx = candidateContext(candidateName, jobTitle);
    return { subject: renderMergeTags(subject, ctx), body: renderMergeTags(body, ctx) };
}

/* ── Validation ────────────────────────────────────────────────────────── */

export const CANDIDATE_SUBJECT_MAX = 120;
export const CANDIDATE_BODY_MAX = 8000;

export function validateCandidateMessage(input: { subject?: string; body?: string }): string | null {
    const subject = (input.subject ?? "").trim();
    if (subject.length < 3) return "The subject is what they'll see first — give it something.";
    if (subject.length > CANDIDATE_SUBJECT_MAX) return `Keep the subject under ${CANDIDATE_SUBJECT_MAX} characters.`;

    const body = (input.body ?? "").trim();
    if (body.length < 10) return "There's no message here yet.";
    if (body.length > CANDIDATE_BODY_MAX) return "That message is too long for an email.";

    const unknown = [...unknownCandidateTags(subject), ...unknownCandidateTags(body)];
    if (unknown.length) return `Unknown tag {{${unknown[0]}}} — it would be sent exactly as written.`;
    return null;
}
