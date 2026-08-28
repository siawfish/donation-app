"use server";

/**
 * Contact form submissions, stored rather than emailed.
 *
 * The old flow handed the message to SMTP and forgot it. That is fine until the
 * credentials rotate, and then every message is lost while the sender is still
 * told it went through. Storing first means the record exists whatever happens
 * next, and it can be searched, assigned and closed.
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
import {
    ContactMessage, ContactReply, ContactStatus, ContactTopic, MESSAGE_MAX, NAME_MAX,
    TOPIC_LABELS, validateContact, validateReply,
} from "@/lib/contact";
import { renderReplyEmail, renderReplyText } from "@/lib/email/template";
import { fillVars, resolveTemplate, type TemplateOverride } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/provider";
import { siteUrl } from "@/lib/seo";

const MESSAGES = "contactMessages";

/** The subject line for replies is editable in Admin → Email templates. */
async function loadReplyOverride(): Promise<TemplateOverride | null> {
    try {
        const snap = await db.collection("emailTemplates").doc("contact_reply").get();
        return snap.exists ? (snap.data() as TemplateOverride) : null;
    } catch {
        return null;
    }
}

const iso = () => new Date().toISOString();

async function requireContactAdmin(): Promise<string> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "contact.manage")) throw new Error("You don't have permission to read messages.");
    return tokens.decodedToken.uid;
}

/**
 * How many messages one address may send in an hour.
 *
 * Generous — somebody genuinely stuck will send two or three — but enough to
 * stop a script filling the table overnight.
 */
const HOURLY_LIMIT = 5;

export async function submitContactMessage(input: {
    name: string;
    email: string;
    phone?: string;
    topic: ContactTopic;
    message: string;
    fromPath?: string;
    /** Hidden field. Humans leave it empty; most bots fill everything in. */
    website?: string;
}): Promise<ResponseData<null>> {
    try {
        // The honeypot is answered with success on purpose. Telling a bot it was
        // detected just teaches whoever wrote it to stop filling that field.
        if (input.website?.trim()) {
            return { success: true, message: "Thanks — we'll be in touch.", data: null };
        }

        const problem = validateContact(input);
        if (problem) throw new Error(problem);

        const email = input.email.trim().toLowerCase();

        // Counted in code rather than with a second `where`. An equality filter
        // plus a range filter is a composite query, which Firestore refuses
        // without a matching composite index — and the failure surfaced as
        // every single message being rejected. One equality filter needs no
        // index at all.
        //
        // The check is also best-effort: if it throws for any reason the message
        // still goes through, because losing somebody's genuine request for help
        // is far worse than storing one extra row.
        try {
            const since = Date.now() - 3600_000;
            const recent = await db.collection(MESSAGES)
                .where("email", "==", email)
                .limit(HOURLY_LIMIT * 4)
                .get();
            const inLastHour = recent.docs.filter(
                (d) => Date.parse((d.data().createdAt as string) ?? "") >= since
            ).length;
            if (inLastHour >= HOURLY_LIMIT) {
                throw new Error("You've sent a few already — give us a chance to reply first.");
            }
        } catch (limitError: any) {
            if (limitError?.message?.startsWith("You've sent")) throw limitError;
        }

        // A signed-in sender is recorded so their account can be opened from the
        // message, but signing in is never required to ask for help.
        const tokens = await getTokens(await cookies(), authConfig).catch(() => null);

        const now = iso();
        await db.collection(MESSAGES).add({
            name: input.name.trim().slice(0, NAME_MAX),
            email,
            phone: (input.phone ?? "").trim().slice(0, 40),
            topic: input.topic,
            message: input.message.trim().slice(0, MESSAGE_MAX),
            status: "new" as ContactStatus,
            ...(tokens ? { uid: tokens.decodedToken.uid } : {}),
            fromPath: (input.fromPath ?? "").slice(0, 200),
            notes: "",
            createdAt: now,
            updatedAt: now,
        });

        revalidatePath("/app/admin/contact");
        return { success: true, message: "Thanks — we'll be in touch.", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function listContactMessages(): Promise<ResponseData<ContactMessage[]>> {
    try {
        await requireContactAdmin();
        const snap = await db.collection(MESSAGES).limit(2000).get();
        return {
            success: true,
            message: "ok",
            data: snap.docs
                .map((d) => ({ ...(d.data() as ContactMessage), id: d.id }))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Unanswered messages, for the badge on the admin sidebar. */
export async function countNewContactMessages(): Promise<number> {
    try {
        const snap = await db.collection(MESSAGES).where("status", "==", "new").count().get();
        return snap.data().count ?? 0;
    } catch {
        return 0;
    }
}

export async function setContactStatus(
    id: string,
    status: ContactStatus
): Promise<ResponseData<null>> {
    try {
        const actor = await requireContactAdmin();

        const ref = db.collection(MESSAGES).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Not found");
        const msg = snap.data() as ContactMessage;

        await ref.update({
            status,
            handledBy: actor,
            handledAt: iso(),
            updatedAt: iso(),
        });

        // Only the destructive-ish transitions are logged. Every status change
        // would bury the log in noise that nobody would ever read.
        if (status === "spam") {
            await recordAudit({
                action: "contact.spam",
                targetId: id,
                targetLabel: `${msg.name} <${msg.email}>`,
                detail: TOPIC_LABELS[msg.topic] ?? msg.topic,
            });
        }

        revalidatePath("/app/admin/contact");
        return { success: true, message: `Marked ${status}`, data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function saveContactNotes(id: string, notes: string): Promise<ResponseData<null>> {
    try {
        await requireContactAdmin();
        await db.collection(MESSAGES).doc(id).update({
            notes: (notes ?? "").slice(0, 4000),
            updatedAt: iso(),
        });
        revalidatePath("/app/admin/contact");
        return { success: true, message: "Note saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteContactMessage(id: string): Promise<ResponseData<null>> {
    try {
        await requireContactAdmin();
        const snap = await db.collection(MESSAGES).doc(id).get();
        if (!snap.exists) throw new Error("Not found");
        const msg = snap.data() as ContactMessage;

        await snap.ref.delete();

        await recordAudit({
            action: "contact.delete",
            targetId: id,
            targetLabel: `${msg.name} <${msg.email}>`,
            detail: "deleted a contact message",
        });

        revalidatePath("/app/admin/contact");
        return { success: true, message: "Deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Replying ──────────────────────────────────────────────────────────── */

/**
 * Answer a contact message from inside the admin.
 *
 * The reply is stored on the message whether or not it was delivered, and the
 * record says which. Losing track of what was promised because the mail bounced
 * is worse than the bounce: the next person to open the thread would answer as
 * if nothing had been said.
 */
export async function replyToContactMessage(
    id: string,
    body: string,
    options?: { resolve?: boolean }
): Promise<ResponseData<ContactMessage | null>> {
    try {
        const actor = await requireContactAdmin();

        const problem = validateReply(body);
        if (problem) throw new Error(problem);

        const ref = db.collection(MESSAGES).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("That message is no longer here.");
        const message = { ...(snap.data() as ContactMessage), id: snap.id };

        if (message.status === "spam") {
            throw new Error("That one is marked as spam. Un-mark it first if you meant to reply.");
        }

        const who = await db.collection("users").doc(actor).get();
        const senderName = who.data()?.name ?? "Givny";

        const shell = {
            originalMessage: message.message,
            replyBody: body.trim(),
            recipientName: message.name,
            siteUrl: siteUrl(),
        };

        const template = resolveTemplate("contact_reply", await loadReplyOverride());
        const subject = fillVars(template.subject, {
            first_name: message.name.trim().split(/\s+/)[0] || "there",
        });

        const result = await sendEmail({
            to: message.email,
            subject,
            html: renderReplyEmail(shell),
            text: renderReplyText(shell),
        });

        const reply: ContactReply = {
            body: body.trim(),
            sentBy: actor,
            sentByName: senderName,
            sentAt: iso(),
            delivered: result.ok && result.provider !== "dry-run",
            ...(result.ok ? {} : { error: result.error ?? "The provider refused it." }),
        };

        await ref.update({
            replies: [...(message.replies ?? []), reply],
            // Replying moves it out of "nobody has looked", and optionally
            // closes it — most replies are the end of the conversation.
            status: options?.resolve ? "resolved" : "open",
            handledBy: actor,
            handledAt: iso(),
            updatedAt: iso(),
        });

        revalidatePath("/app/admin/contact");

        const fresh = await ref.get();
        const data = { ...(fresh.data() as ContactMessage), id: fresh.id };

        if (!result.ok) {
            return {
                success: false,
                message: `Saved, but not delivered: ${result.error ?? "the provider refused it"}`,
                data,
            };
        }

        return {
            success: true,
            message: result.provider === "dry-run"
                ? "Saved to the thread — no email provider is configured, so nothing was delivered."
                : `Replied to ${message.name}`,
            data,
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
