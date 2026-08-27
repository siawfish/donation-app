/**
 * Messages sent through the contact form.
 *
 * These used to go straight to an inbox, which meant no record anyone could
 * search, no way to tell what had been answered, and a silent failure whenever
 * SMTP was misconfigured — the sender saw a success message and nobody ever
 * received anything. They are stored now, and email is at most a notification
 * about something that already exists.
 */

export type ContactTopic = "support" | "partnership" | "organisation" | "press" | "other";

export const TOPIC_LABELS: Record<ContactTopic, string> = {
    support: "Help with Givny",
    partnership: "Partnership",
    organisation: "List as an organisation",
    press: "Press or research",
    other: "Something else",
};

export const TOPIC_BLURB: Record<ContactTopic, string> = {
    support: "Something isn't working, or you're stuck.",
    partnership: "You'd like to work with us.",
    organisation: "Your business, NGO or school wants a page.",
    press: "You're writing about us, or studying the problem.",
    other: "Anything that doesn't fit above.",
};

/**
 * Where a message is in its life.
 *
 * `new` is deliberately distinct from `open`: the first is "nobody has looked",
 * the second is "someone has and it isn't finished". Collapsing them loses the
 * only number that matters on a Monday morning.
 */
export type ContactStatus = "new" | "open" | "resolved" | "spam";

export const STATUS_LABELS: Record<ContactStatus, string> = {
    new: "New",
    open: "In progress",
    resolved: "Resolved",
    spam: "Spam",
};

export const STATUS_TONE: Record<ContactStatus, "info" | "warn" | "good" | "neutral"> = {
    new: "info",
    open: "warn",
    resolved: "good",
    spam: "neutral",
};

export interface ContactMessage {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    topic: ContactTopic;
    message: string;
    status: ContactStatus;

    /** Set when a signed-in member writes, so their account can be opened. */
    uid?: string;
    /** Which page they were on. Often the fastest route to what went wrong. */
    fromPath?: string;

    /** Internal only — never returned to the sender. */
    notes?: string;
    handledBy?: string;
    handledAt?: string;

    createdAt: string;
    updatedAt: string;
}

export const MESSAGE_MAX = 4000;
export const NAME_MAX = 80;

export function isValidContactEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email ?? "").trim());
}

/**
 * Reject a message before it costs a write.
 *
 * Returns the first problem in the order a person reads the form, so the error
 * points at the field they would fix first rather than the last one checked.
 */
export function validateContact(input: {
    name?: string;
    email?: string;
    message?: string;
    topic?: string;
}): string | null {
    const name = (input.name ?? "").trim();
    if (name.length < 2) return "Tell us your name.";
    if (name.length > NAME_MAX) return "That name is too long.";

    if (!isValidContactEmail(input.email ?? "")) return "That email address doesn't look right.";

    const message = (input.message ?? "").trim();
    if (message.length < 10) return "Say a little more so we can actually help.";
    if (message.length > MESSAGE_MAX) return `Keep it under ${MESSAGE_MAX} characters.`;

    if (input.topic && !(input.topic in TOPIC_LABELS)) return "Pick what this is about.";
    return null;
}

/** A one-line preview for the admin table. */
export function contactPreview(message: string, length = 90): string {
    const flat = (message ?? "").replace(/\s+/g, " ").trim();
    return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
