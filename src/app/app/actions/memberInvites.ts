"use server";

/**
 * Inviting people to join, by email.
 *
 * The member equivalent of `createOrgInvite`, with one deliberate difference:
 * this one always sends the mail. An organisation invitation is usually handed
 * over on WhatsApp by an admin who knows the contact, so returning the link was
 * the point. These go to lists of addresses nobody is going to message
 * individually.
 */

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { revalidatePath } from "next/cache";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import { sendTemplated } from "./emailTemplates";
import { findAuthUserByEmail } from "@/lib/adminAuth";
import { siteUrl } from "@/lib/seo";
import {
    EMAIL_RE, MAX_PER_BATCH, MemberInvite, inviteExpiry, parseEmails,
} from "@/lib/memberInvites";

const INVITES = "memberInvites";

const iso = () => new Date().toISOString();

async function requireInviter() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "users.invite")) throw new Error("You don't have permission to invite people.");

    const profile = await db.collection("users").doc(tokens.decodedToken.uid).get();
    return {
        uid: tokens.decodedToken.uid,
        name: String(profile.data()?.name ?? "").trim(),
    };
}

/** Same entropy as the organisation invitations — guessing one is not a strategy. */
function inviteToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function inviteUrl(token: string): string {
    return `${siteUrl()}/auth/register?invite=${token}`;
}

async function deliver(invite: MemberInvite) {
    // The note is dropped straight into the body, so an empty one has to be an
    // empty string rather than a stray "undefined" or a lonely blank line the
    // reader wonders about.
    void sendTemplated("member_invite", invite.email, {
        inviter_name: invite.invitedByName || "Someone at Givny",
        invite_note: invite.note?.trim() ? invite.note.trim() : "",
        invite_url: inviteUrl(invite.token),
    });
}

export interface InviteOutcome {
    sent: string[];
    /** Already has an account — inviting them again would only confuse. */
    alreadyMembers: string[];
    /** A live invitation is already out; a second link helps nobody. */
    alreadyInvited: string[];
    /** Didn't look like an address. Reported rather than silently dropped. */
    unusable: string[];
}

/**
 * Invite a pasted list of addresses.
 *
 * Never throws part-way through a list. An admin who pastes thirty addresses
 * and gets an error has no idea which ones went, so every address is resolved
 * into one of four buckets and all four come back.
 */
export async function inviteMembers({
    emails,
    note = "",
}: {
    emails: string;
    note?: string;
}): Promise<ResponseData<InviteOutcome | null>> {
    try {
        const actor = await requireInviter();

        const { valid, invalid } = parseEmails(emails);
        if (!valid.length && !invalid.length) throw new Error("Add at least one email address.");
        if (valid.length > MAX_PER_BATCH) {
            throw new Error(`That's ${valid.length} addresses. Send at most ${MAX_PER_BATCH} at a time.`);
        }

        const outcome: InviteOutcome = { sent: [], alreadyMembers: [], alreadyInvited: [], unusable: invalid };
        const trimmedNote = note.trim().slice(0, 240);

        for (const email of valid) {
            // Two separate questions: does a sign-in account exist, and is a
            // link already out? Somebody can be in the second state without the
            // first, which is the whole point of tracking invitations.
            const [account, pending] = await Promise.all([
                findAuthUserByEmail(email),
                db.collection(INVITES).where("email", "==", email).where("status", "==", "pending").get(),
            ]);

            if (account) { outcome.alreadyMembers.push(email); continue; }
            if (!pending.empty) { outcome.alreadyInvited.push(email); continue; }

            const invite: MemberInvite = {
                email,
                note: trimmedNote,
                token: inviteToken(),
                status: "pending",
                invitedBy: actor.uid,
                invitedByName: actor.name,
                createdAt: iso(),
                expiresAt: inviteExpiry(),
                sentCount: 1,
                lastSentAt: iso(),
            };

            await db.collection(INVITES).add(invite);
            await deliver(invite);
            outcome.sent.push(email);
        }

        if (outcome.sent.length) {
            await recordAudit({
                action: "member.invite",
                targetId: actor.uid,
                targetLabel: `${outcome.sent.length} invitation${outcome.sent.length === 1 ? "" : "s"}`,
                detail: outcome.sent.join(", ").slice(0, 500),
            });
        }

        revalidatePath("/app/admin/members");

        const parts: string[] = [];
        if (outcome.sent.length) parts.push(`${outcome.sent.length} sent`);
        if (outcome.alreadyMembers.length) parts.push(`${outcome.alreadyMembers.length} already a member`);
        if (outcome.alreadyInvited.length) parts.push(`${outcome.alreadyInvited.length} already invited`);
        if (outcome.unusable.length) parts.push(`${outcome.unusable.length} unusable`);

        return { success: true, message: parts.join(", ") || "Nothing to send", data: outcome };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function listMemberInvites(): Promise<ResponseData<MemberInvite[]>> {
    try {
        await requireInviter();
        const snap = await db.collection(INVITES).get();
        const rows = snap.docs
            .map((d) => ({ ...(d.data() as MemberInvite), id: d.id }))
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Send the same link again, without minting a new one. */
export async function resendMemberInvite(inviteId: string): Promise<ResponseData<null>> {
    try {
        await requireInviter();

        const snap = await db.collection(INVITES).doc(inviteId).get();
        if (!snap.exists) throw new Error("That invitation no longer exists.");
        const invite = { ...(snap.data() as MemberInvite), id: snap.id };
        if (invite.status !== "pending") throw new Error("That invitation is no longer open.");

        // Pushed out rather than left to run down, so a resend is worth
        // something to somebody who received the first one three weeks ago.
        const expiresAt = inviteExpiry();
        await snap.ref.update({
            expiresAt,
            sentCount: (invite.sentCount ?? 1) + 1,
            lastSentAt: iso(),
        });

        await deliver({ ...invite, expiresAt });
        revalidatePath("/app/admin/members");
        return { success: true, message: `Sent again to ${invite.email}`, data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function revokeMemberInvite(inviteId: string): Promise<ResponseData<null>> {
    try {
        await requireInviter();

        const snap = await db.collection(INVITES).doc(inviteId).get();
        if (!snap.exists) throw new Error("That invitation no longer exists.");
        const invite = snap.data() as MemberInvite;
        if (invite.status === "accepted") throw new Error("That one has already been used.");

        await snap.ref.update({ status: "revoked" });
        await recordAudit({
            action: "member.invite.revoke",
            targetId: inviteId,
            targetLabel: invite.email,
        });

        revalidatePath("/app/admin/members");
        return { success: true, message: "Invitation withdrawn", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Mark an invitation used, once the account exists.
 *
 * Called from registration and deliberately forgiving: a token that is expired,
 * withdrawn or simply wrong must never stop somebody signing up. The worst case
 * is an admin seeing an invitation still listed as pending, which is a
 * reporting inaccuracy, not a locked door.
 */
export async function acceptMemberInvite(token: string, uid: string, email: string): Promise<void> {
    try {
        if (!token || !EMAIL_RE.test(email)) return;

        const snap = await db.collection(INVITES).where("token", "==", token).limit(1).get();
        if (snap.empty) return;

        const doc = snap.docs[0];
        const invite = doc.data() as MemberInvite;
        if (invite.status !== "pending") return;

        // Somebody forwarding their invitation to a friend is a good outcome,
        // not a fraud — but it should not be recorded as the invited person
        // having accepted, because the admin is reading that number to decide
        // whether their list was any good.
        if (invite.email.toLowerCase() !== email.trim().toLowerCase()) return;

        await doc.ref.update({ status: "accepted", acceptedAt: iso(), acceptedUid: uid });
    } catch {
        /* See the note above. */
    }
}

export interface MemberInvitePreview {
    email: string;
    inviterName: string;
}

/**
 * What the registration page needs to greet somebody arriving from an invite.
 *
 * Unauthenticated on purpose — the token *is* the credential, and the page is
 * reached before anybody has an account to be checked against. It returns
 * nothing at all for a token that is spent, withdrawn, expired or invented, so
 * a guessed token reveals no addresses.
 */
export async function previewMemberInvite(token: string): Promise<MemberInvitePreview | null> {
    try {
        if (!token) return null;

        const snap = await db.collection(INVITES).where("token", "==", token).limit(1).get();
        if (snap.empty) return null;

        const invite = snap.docs[0].data() as MemberInvite;
        if (invite.status !== "pending") return null;
        if (Date.parse(invite.expiresAt) < Date.now()) return null;

        return { email: invite.email, inviterName: invite.invitedByName || "" };
    } catch {
        return null;
    }
}
