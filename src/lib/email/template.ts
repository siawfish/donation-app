/**
 * The HTML a campaign actually becomes.
 *
 * Email clients are twenty years behind browsers: Outlook renders through Word,
 * Gmail strips <style> blocks, and flexbox does not exist. So this is tables and
 * inline styles on purpose — the modern version looks better in a preview pane
 * and falls apart in the inboxes most of our members actually use.
 */

import { renderMarkdown } from "../markdown";

const FOREST = "#0C3B2E";
const LIME = "#D9F36E";
const INK = "#10150F";
const CANVAS = "#FAFAF7";
const MUTED = "#6b7280";

export interface EmailShell {
    subject: string;
    preheader?: string;
    bodyMarkdown: string;
    ctaLabel?: string;
    ctaUrl?: string;
    /** Absolute, one-click, unique per recipient. Required — see below. */
    unsubscribeUrl: string;
    /** 1×1 image that records an open. Omitted for previews and test sends. */
    openPixelUrl?: string;
    siteUrl: string;
}

/**
 * Wrap the message in the shell every campaign shares.
 *
 * The unsubscribe link is not optional and is not configurable. A marketing
 * mail without one is unlawful in most places we might ever send to, and it is
 * the difference between somebody leaving quietly and somebody reporting us as
 * spam — which costs the deliverability of every other mail we send.
 */
export function renderCampaignEmail(shell: EmailShell): string {
    const body = renderMarkdown(shell.bodyMarkdown);

    const button = shell.ctaLabel && shell.ctaUrl
        ? `
      <tr>
        <td style="padding:28px 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="${FOREST}" style="border-radius:999px;">
                <a href="${escapeAttr(shell.ctaUrl)}"
                   style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;
                          font-size:15px;font-weight:bold;color:${LIME};text-decoration:none;border-radius:999px;">
                  ${escapeHtml(shell.ctaLabel)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        : "";

    // Hidden, and the first text in the document — this is what a client shows
    // beside the subject line before anyone opens anything.
    const preheader = shell.preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(shell.preheader)}</div>`
        : "";

    const pixel = shell.openPixelUrl
        ? `<img src="${escapeAttr(shell.openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;" />`
        : "";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(shell.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:28px 28px 0;">
            <a href="${escapeAttr(shell.siteUrl)}"
               style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;
                      color:${FOREST};text-decoration:none;">Givny</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;
                     line-height:1.65;color:${INK};">
            ${body}
          </td>
        </tr>
        ${button}
        <tr>
          <td style="padding:28px;">
            <hr style="border:0;border-top:1px solid #e5e7eb;margin:0 0 16px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                      line-height:1.6;color:${MUTED};">
              You're getting this because you have a Givny account.
              <a href="${escapeAttr(shell.unsubscribeUrl)}" style="color:${MUTED};">
                Stop receiving these emails
              </a>.
            </p>
            <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">
              Givny · Ghana · <a href="${escapeAttr(shell.siteUrl)}" style="color:${MUTED};">givny.com</a>
            </p>
          </td>
        </tr>
      </table>
      ${pixel}
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Plain-text alternative. Clients that get only HTML are scored as spammier. */
export function renderCampaignText(shell: Omit<EmailShell, "openPixelUrl">): string {
    const text = shell.bodyMarkdown
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
        .replace(/^#+\s*/gm, "");

    const cta = shell.ctaLabel && shell.ctaUrl ? `\n\n${shell.ctaLabel}: ${shell.ctaUrl}` : "";

    return `${text}${cta}\n\n---\nYou're getting this because you have a Givny account.\nStop receiving these emails: ${shell.unsubscribeUrl}\nGivny · Ghana · ${shell.siteUrl}\n`;
}

function escapeHtml(value: string): string {
    return (value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
    return escapeHtml(value).replace(/'/g, "&#39;");
}
