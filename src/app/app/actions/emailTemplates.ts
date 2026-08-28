"use server";

/**
 * Reading, editing and using the email templates.
 *
 * `sendTemplated` is the only way transactional mail should leave the platform
 * from now on. Every call site that composes its own subject line is a place
 * the admin cannot fix a typo without a deploy, and a place that quietly
 * disagrees with the rest of the mail we send.
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
import { sendEmail } from "@/lib/email/provider";
import { renderCampaignEmail, renderCampaignText } from "@/lib/email/template";
import {
    ResolvedTemplate, TEMPLATES, TemplateKey, TemplateOverride,
    checkTemplate, exampleValues, fillBody, fillVars, hasBlockingError, resolveTemplate,
} from "@/lib/email/templates";
import { siteUrl } from "@/lib/seo";

const COLLECTION = "emailTemplates";

const iso = () => new Date().toISOString();

async function requireTemplateAdmin(): Promise<string> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "crm.manage")) throw new Error("You don't have permission to edit email templates.");
    return tokens.decodedToken.uid;
}

async function loadOverride(key: TemplateKey): Promise<TemplateOverride | null> {
    try {
        const snap = await db.collection(COLLECTION).doc(key).get();
        return snap.exists ? (snap.data() as TemplateOverride) : null;
    } catch {
        return null;
    }
}

/* ── Reading ───────────────────────────────────────────────────────────── */

export async function listEmailTemplates(): Promise<ResponseData<ResolvedTemplate[]>> {
    try {
        await requireTemplateAdmin();

        const snap = await db.collection(COLLECTION).get();
        const overrides = new Map(snap.docs.map((d) => [d.id, d.data() as TemplateOverride]));

        return {
            success: true,
            message: "ok",
            data: TEMPLATES.map((t) => resolveTemplate(t.key, overrides.get(t.key) ?? null)),
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export interface TemplatePreview {
    subject: string;
    preheader: string;
    html: string;
    text: string;
}

/** Render a draft exactly as it would be sent, with example values filled in. */
export async function previewEmailTemplate(
    key: TemplateKey,
    draft: { subject: string; preheader: string; body: string; ctaLabel?: string; ctaUrl?: string }
): Promise<ResponseData<TemplatePreview | null>> {
    try {
        await requireTemplateAdmin();

        const def = resolveTemplate(key, null);
        const values = { ...exampleValues(def), site_url: siteUrl() };

        const shell = {
            subject: fillVars(draft.subject, values),
            preheader: fillVars(draft.preheader, values),
            bodyMarkdown: fillBody(draft.body, values),
            ctaLabel: draft.ctaLabel ? fillVars(draft.ctaLabel, values) : undefined,
            ctaUrl: draft.ctaUrl ? fillVars(draft.ctaUrl, values) : undefined,
            // Only marketing gets an opt-out footer, so a preview of a
            // transactional template shows exactly what will be delivered.
            unsubscribeUrl: def.unsubscribable ? `${siteUrl()}/unsubscribe/preview` : undefined,
            siteUrl: siteUrl(),
        };

        return {
            success: true,
            message: "ok",
            data: {
                subject: shell.subject,
                preheader: shell.preheader,
                html: renderCampaignEmail(shell),
                text: renderCampaignText(shell),
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Editing ───────────────────────────────────────────────────────────── */

export async function saveEmailTemplate(
    key: TemplateKey,
    draft: { subject: string; preheader: string; body: string; ctaLabel?: string; ctaUrl?: string; enabled?: boolean }
): Promise<ResponseData<null>> {
    try {
        const actor = await requireTemplateAdmin();

        const def = resolveTemplate(key, null);
        const problems = checkTemplate(def, draft);
        if (hasBlockingError(problems)) {
            throw new Error(problems.find((p) => p.level === "error")!.message);
        }

        await db.collection(COLLECTION).doc(key).set(
            {
                key,
                subject: draft.subject,
                preheader: draft.preheader,
                body: draft.body,
                ctaLabel: draft.ctaLabel ?? "",
                ctaUrl: draft.ctaUrl ?? "",
                enabled: draft.enabled !== false,
                updatedBy: actor,
                updatedAt: iso(),
            },
            { merge: true }
        );

        await recordAudit({
            action: "email.template",
            targetId: key,
            targetLabel: def.name,
            detail: draft.enabled === false ? "edited and switched off" : "edited",
        });

        revalidatePath("/app/admin/email");
        return { success: true, message: "Template saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Drop the override entirely rather than writing the default back.
 *
 * Copying the default in would freeze today's wording — a later improvement to
 * the shipped copy would then never reach this template.
 */
export async function resetEmailTemplate(key: TemplateKey): Promise<ResponseData<null>> {
    try {
        await requireTemplateAdmin();
        await db.collection(COLLECTION).doc(key).delete();

        await recordAudit({
            action: "email.template",
            targetId: key,
            targetLabel: resolveTemplate(key, null).name,
            detail: "reset to the default",
        });

        revalidatePath("/app/admin/email");
        return { success: true, message: "Reset to the default", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function sendTemplateTest(
    key: TemplateKey,
    to: string,
    draft: { subject: string; preheader: string; body: string; ctaLabel?: string; ctaUrl?: string }
): Promise<ResponseData<null>> {
    try {
        await requireTemplateAdmin();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to.trim())) {
            throw new Error("That email address doesn't look right.");
        }

        const preview = await previewEmailTemplate(key, draft);
        if (!preview.data) throw new Error(preview.message);

        const result = await sendEmail({
            to: to.trim(),
            subject: preview.data.subject,
            html: preview.data.html,
            text: preview.data.text,
        });
        if (!result.ok) throw new Error(result.error ?? "The provider refused it.");

        return {
            success: true,
            message: result.provider === "dry-run"
                ? "No provider configured — nothing was delivered."
                : `Test sent to ${to.trim()}`,
            data: null,
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Sending ───────────────────────────────────────────────────────────── */

/**
 * Send one templated email.
 *
 * Never throws and never awaits anything the caller depends on: an approval or
 * an application must not fail because a mail server was slow. Callers fire
 * this and carry on.
 */
export async function sendTemplated(
    key: TemplateKey,
    to: string,
    values: Record<string, string>
): Promise<void> {
    try {
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return;

        const template = resolveTemplate(key, await loadOverride(key));
        // An admin can switch a template off without deleting the words —
        // useful while the wording is still being argued about.
        if (!template.enabled) return;

        const filled = { ...values, site_url: siteUrl() };
        const shell = {
            subject: fillVars(template.subject, filled),
            preheader: fillVars(template.preheader, filled),
            bodyMarkdown: fillBody(template.body, filled),
            ctaLabel: template.ctaLabel ? fillVars(template.ctaLabel, filled) : undefined,
            ctaUrl: template.ctaUrl ? fillVars(template.ctaUrl, filled) : undefined,
            unsubscribeUrl: template.unsubscribable
                ? `${siteUrl()}/unsubscribe/${values.unsubscribe_token ?? "none"}`
                : undefined,
            siteUrl: siteUrl(),
        };

        await sendEmail({
            to,
            subject: shell.subject,
            html: renderCampaignEmail(shell),
            text: renderCampaignText(shell),
        });
    } catch {
        // Deliberately silent. See the note above.
    }
}
