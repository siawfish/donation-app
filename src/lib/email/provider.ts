import "server-only";

/**
 * Where an email actually goes.
 *
 * Two adapters, chosen by what is configured, because the honest answer for
 * this platform changes over time:
 *
 *   RESEND_API_KEY  → Resend's HTTP API. What bulk mail should use: it handles
 *                     bounces, reputation and the DKIM/SPF/DMARC records that
 *                     decide whether Gmail files us under Promotions or Spam.
 *   EMAIL_HOST/…    → the existing SMTP account, over nodemailer.
 *   neither         → dry run. Everything is recorded exactly as it would be,
 *                     and nothing leaves the building.
 *
 * The dry run is not a placeholder to be replaced later — it is how a campaign
 * gets rehearsed against real recipients without mailing them, and how this
 * works at all on a machine with no credentials.
 */

export type ProviderName = "resend" | "smtp" | "dry-run";

export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Per-recipient one-click unsubscribe, surfaced as a real mail header. */
    unsubscribeUrl?: string;
}

export interface SendResult {
    ok: boolean;
    provider: ProviderName;
    id?: string;
    error?: string;
}

const FROM = process.env.EMAIL_FROM || "Givny <hello@givny.com>";

export function activeProvider(): ProviderName {
    if (process.env.RESEND_API_KEY) return "resend";
    if (process.env.EMAIL_HOST && process.env.EMAIL && process.env.EMAIL_PASSWORD) return "smtp";
    return "dry-run";
}

/** What the admin screen tells you about deliverability, in plain words. */
export function providerDescription(provider: ProviderName): string {
    switch (provider) {
        case "resend":
            return "Sending through Resend. Bounces and complaints are handled by the provider.";
        case "smtp":
            return "Sending over your SMTP account. Fine for small batches; a normal mailbox will start rejecting bulk sends, and nothing tracks bounces.";
        default:
            return "No email provider configured. Campaigns run as a rehearsal: every recipient is recorded, nothing is delivered.";
    }
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
    const provider = activeProvider();

    try {
        if (provider === "resend") return await sendViaResend(message);
        if (provider === "smtp") return await sendViaSmtp(message);
        return { ok: true, provider: "dry-run", id: "dry-run" };
    } catch (error: any) {
        return { ok: false, provider, error: error?.message ?? "Unknown send failure" };
    }
}

async function sendViaResend(message: EmailMessage): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: FROM,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            // Gmail and Outlook surface this as their own unsubscribe control,
            // which people use instead of the spam button.
            headers: message.unsubscribeUrl
                ? {
                      "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
                      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  }
                : undefined,
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return { ok: false, provider: "resend", error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, provider: "resend", id: data?.id };
}

async function sendViaSmtp(message: EmailMessage): Promise<SendResult> {
    // Imported lazily so a project without nodemailer installed still builds,
    // and so the dependency is not pulled into every request that never mails.
    const nodemailer = (await import("nodemailer")).default;

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT ?? 465),
        secure: String(process.env.EMAIL_SECURE ?? "true") === "true",
        auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
    });

    const info = await transport.sendMail({
        from: FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.unsubscribeUrl
            ? {
                  "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              }
            : undefined,
    });

    return { ok: true, provider: "smtp", id: info.messageId };
}
