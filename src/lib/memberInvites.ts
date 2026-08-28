/**
 * Invitations to join Givny, sent by an admin.
 *
 * Distinct from `orgInvites`, which hand somebody an existing organisation
 * page. This one is simpler: an address, a link, and a record of whether it was
 * ever used — which is the only part that makes it worth storing at all. An
 * admin who cannot see that forty invitations went out and two were accepted
 * is guessing about the thing they most need to know.
 */

export type MemberInviteStatus = "pending" | "accepted" | "revoked";

export interface MemberInvite {
    id?: string;
    email: string;
    name?: string;
    /** A short line from the inviter, shown in the email. */
    note?: string;
    token: string;
    status: MemberInviteStatus;
    invitedBy: string;
    invitedByName?: string;
    createdAt: string;
    expiresAt: string;
    /** Set when the link is used, so acceptance is measurable. */
    acceptedAt?: string;
    acceptedUid?: string;
    /** Bumped each time the email is sent again. */
    sentCount?: number;
    lastSentAt?: string;
}

/** Long enough that these expire before they leak, short enough to be useful. */
export const INVITE_DAYS = 30;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function inviteExpiry(from = new Date()): string {
    const d = new Date(from);
    d.setDate(d.getDate() + INVITE_DAYS);
    return d.toISOString();
}

export function inviteExpired(invite: Pick<MemberInvite, "expiresAt">): boolean {
    const at = Date.parse(invite.expiresAt);
    return Number.isFinite(at) && at < Date.now();
}

/**
 * Pull addresses out of whatever an admin pasted.
 *
 * In practice that is a column copied from a spreadsheet, a WhatsApp export, or
 * a line of "Ama <ama@example.com>, Kofi <kofi@example.com>". All three are
 * handled without asking the admin to tidy anything up first.
 *
 * Anything left over that is not an address comes back as `invalid` rather than
 * being dropped, so a typo is reported instead of silently costing somebody
 * their invitation.
 */
export function parseEmails(input: string): { valid: string[]; invalid: string[] } {
    // "Ama <ama@example.com>" first, because splitting it up would leave
    // "Ama" behind and report the sender's own display name back to them as
    // an address that will not send.
    const unwrapped = (input ?? "").replace(/[^,;\n<>]*<([^>]+)>/g, "$1");

    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const raw of unwrapped.split(/[\s,;]+/)) {
        const candidate = raw.trim().replace(/^[("']+|[)"'.]+$/g, "").toLowerCase();
        if (!candidate) continue;
        if (!EMAIL_RE.test(candidate)) { invalid.push(candidate); continue; }
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        valid.push(candidate);
    }

    return { valid, invalid };
}

/** How many go out in one submission. Enough for a real list, not a blast. */
export const MAX_PER_BATCH = 50;
