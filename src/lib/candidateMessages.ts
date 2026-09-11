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
 * same shape of editor (a preset to start from, a live preview, a send
 * button that can't be pressed twice).
 *
 * The five presets below are deliberately plain rather than corporate —
 * short, first-person, and honest about where things stand, in keeping with
 * how Givny talks to people everywhere else in the product. "Other" is a
 * blank slate for anything the four fixed moments don't cover.
 */

import { tagsUsed, renderMergeTags } from "./campaigns";

export type CandidateMessagePurpose = "acknowledge" | "rejection" | "interview" | "offer" | "other";

export const PURPOSE_LABELS: Record<CandidateMessagePurpose, string> = {
    acknowledge: "Acknowledge receipt",
    rejection: "Rejection",
    interview: "Interview invitation",
    offer: "Offer",
    other: "Other",
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

export interface CandidateMessagePreset {
    purpose: CandidateMessagePurpose;
    subject: string;
    body: string;
}

export const CANDIDATE_MESSAGE_PRESETS: CandidateMessagePreset[] = [
    {
        purpose: "acknowledge",
        subject: "We've got your application, {{first_name}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for applying for {{job_title}} — this is just to say it arrived safely.\n\n" +
            "Someone on our team will read it properly and come back to you with next steps, " +
            "or with a straight answer if it isn't a fit this time.\n\n" +
            "Appreciate you taking the time to apply.",
    },
    {
        purpose: "rejection",
        subject: "About your application for {{job_title}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for the time you put into applying for {{job_title}} — we read it properly.\n\n" +
            "We've decided to move forward with other candidates this time. That's not a verdict " +
            "on your work, just where things landed for this particular role.\n\n" +
            "We'd genuinely like to hear from you again if something else opens up that fits. " +
            "Thanks again for considering Givny.",
    },
    {
        purpose: "interview",
        subject: "Let's talk — {{job_title}} at Givny",
        body:
            "Hi {{first_name}},\n\n" +
            "We'd like to talk with you about {{job_title}}. Nothing formal — a conversation " +
            "about what the role actually involves and whether it's a fit both ways.\n\n" +
            "Reply with a couple of times that work for you over the next few days and we'll " +
            "get it in the diary.\n\n" +
            "Looking forward to it.",
    },
    {
        purpose: "offer",
        subject: "We'd like to offer you {{job_title}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Good news — we'd like to offer you the {{job_title}} role.\n\n" +
            "We'll follow up separately with the details, but wanted you to hear it directly " +
            "first. Take the time you need to decide, and let us know if anything's unclear " +
            "before then.\n\n" +
            "Really hope this works out.",
    },
    {
        purpose: "other",
        subject: "About your application, {{first_name}}",
        body: "Hi {{first_name}},\n\n",
    },
];

export function presetFor(purpose: CandidateMessagePurpose): CandidateMessagePreset {
    return CANDIDATE_MESSAGE_PRESETS.find((p) => p.purpose === purpose) ?? CANDIDATE_MESSAGE_PRESETS[CANDIDATE_MESSAGE_PRESETS.length - 1];
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
