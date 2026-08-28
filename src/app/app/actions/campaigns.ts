"use server";

/**
 * Campaigns: build an audience, write to it, measure what came back.
 *
 * The audience is resolved at send time from the CRM's existing segments rather
 * than stored as a list. A segment is a description of a state ("quiet for 30
 * days"), and a list captured last week describes who *was* quiet — sending to
 * that mails people who have since come back, which is the fastest way to teach
 * somebody to ignore us.
 */

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import { listCrmMembers } from "./crm";
import { getTier, getNextTier, calculatePoints, pointsToNextTier, getAchievements, EMPTY_STATS as EMPTY_MEMBER_STATS } from "@/lib/loyalty";
import type { SegmentId } from "@/lib/crm";
import {
    Campaign, CampaignSend, CampaignStats, MergeContext, computeStats,
    renderMergeTags, validateCampaign,
} from "@/lib/campaigns";
import { renderCampaignEmail, renderCampaignText } from "@/lib/email/template";
import { activeProvider, providerDescription, sendEmail, type ProviderName } from "@/lib/email/provider";
import { siteUrl } from "@/lib/seo";

const CAMPAIGNS = "campaigns";
const SENDS = "campaignSends";
const OPTOUTS = "emailOptOuts";

const iso = () => new Date().toISOString();

async function requireMarketingAdmin(): Promise<string> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "crm.manage")) throw new Error("You don't have permission to send campaigns.");
    return tokens.decodedToken.uid;
}

/* ── Opting out ────────────────────────────────────────────────────────── */

/**
 * An unsubscribe token that cannot be guessed and cannot be reversed.
 *
 * Derived from the uid and a server-side secret, so the link in every mail is
 * stable without storing a token per send — and knowing one person's link tells
 * you nothing about anyone else's.
 */
function optOutToken(uid: string): string {
    const secret = process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT ?? "givny";
    return createHash("sha256").update(`${uid}:${secret}`).digest("hex").slice(0, 32);
}

export async function isOptedOut(uid: string): Promise<boolean> {
    try {
        const doc = await db.collection(OPTOUTS).doc(uid).get();
        return doc.exists;
    } catch {
        // A failure to read the suppression list must never be read as consent.
        return true;
    }
}

/** Called from the public unsubscribe page. Never requires a session. */
export async function optOutByToken(token: string): Promise<ResponseData<{ email?: string } | null>> {
    try {
        if (!token || token.length < 16) throw new Error("That link isn't valid.");

        // Tokens are derived, not stored, so the only way to find the owner is
        // to check each member. The list is small and this runs once per
        // unsubscribe — a stored token table would be faster and would also be
        // one more place a link could leak from.
        const users = await db.collection("users").limit(5000).get();
        const match = users.docs.find((d) => optOutToken(d.id) === token);
        if (!match) throw new Error("That link isn't valid.");

        await db.collection(OPTOUTS).doc(match.id).set({
            uid: match.id,
            email: match.data().email ?? "",
            optedOutAt: iso(),
        });

        // Mark it against any campaign they were sent, so the unsubscribe rate
        // is attributed to the mail that caused it.
        const sends = await db.collection(SENDS).where("uid", "==", match.id).get();
        await Promise.all(
            sends.docs
                .filter((d) => !d.data().unsubscribedAt)
                .slice(0, 50)
                .map((d) => d.ref.update({ unsubscribedAt: iso() }))
        );

        return { success: true, message: "You're unsubscribed.", data: { email: match.data().email } };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Audience ──────────────────────────────────────────────────────────── */

export interface AudienceMember {
    uid: string;
    name: string;
    email: string;
    context: MergeContext;
}

/**
 * Everyone a campaign would reach right now.
 *
 * Members with no address, and anyone who has opted out, are dropped here
 * rather than at send time — so the count an admin sees before pressing send is
 * the count that will actually be mailed.
 */
async function resolveAudience(audience: SegmentId): Promise<AudienceMember[]> {
    const res = await listCrmMembers({ segment: audience });
    const rows = res.data ?? [];

    const optOuts = await db.collection(OPTOUTS).limit(5000).get();
    const suppressed = new Set(optOuts.docs.map((d) => d.id));

    return rows
        .filter((m) => m.email && !suppressed.has(m.id))
        .map((m) => {
            // Built from the same figures the leaderboard and the member's own
            // dashboard use, so a mail can never contradict them.
            const stats = {
                ...EMPTY_MEMBER_STATS,
                donationsCompleted: m.rehomedCount ?? 0,
                itemsListed: m.listingsCount ?? 0,
                donationsByCategory: {},
            };
            const points = calculatePoints(stats);
            const tier = getTier(points);
            const next = getNextTier(points);
            const badges = getAchievements(stats, []).filter((a) => a.unlocked).length;

            return {
                uid: m.id,
                name: m.name ?? "",
                email: m.email!,
                context: {
                    first_name: (m.name ?? "").trim().split(/\s+/)[0] || "there",
                    points: String(points),
                    tier: tier.name,
                    next_tier: next?.name ?? tier.name,
                    points_to_next: String(pointsToNextTier(points)),
                    items_listed: String(m.listingsCount ?? 0),
                    items_rehomed: String(m.rehomedCount ?? 0),
                    badges: String(badges),
                },
            };
        });
}

export interface AudiencePreview {
    total: number;
    suppressed: number;
    noEmail: number;
    sample: { name: string; email: string; subject: string }[];
}

/** What this campaign would look like to the first few people who get it. */
export async function previewAudience(
    audience: SegmentId,
    subject: string
): Promise<ResponseData<AudiencePreview | null>> {
    try {
        await requireMarketingAdmin();

        const res = await listCrmMembers({ segment: audience });
        const rows = res.data ?? [];
        const reachable = await resolveAudience(audience);

        return {
            success: true,
            message: "ok",
            data: {
                total: reachable.length,
                suppressed: rows.filter((m) => m.email).length - reachable.length,
                noEmail: rows.filter((m) => !m.email).length,
                sample: reachable.slice(0, 5).map((m) => ({
                    name: m.name,
                    email: m.email,
                    subject: renderMergeTags(subject, m.context),
                })),
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Campaigns ─────────────────────────────────────────────────────────── */

export async function listCampaigns(): Promise<ResponseData<Campaign[]>> {
    try {
        await requireMarketingAdmin();
        const snap = await db.collection(CAMPAIGNS).limit(500).get();
        return {
            success: true,
            message: "ok",
            data: snap.docs
                .map((d) => ({ ...(d.data() as Campaign), id: d.id }))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function getCampaign(id: string): Promise<ResponseData<Campaign | null>> {
    try {
        await requireMarketingAdmin();
        const snap = await db.collection(CAMPAIGNS).doc(id).get();
        if (!snap.exists) throw new Error("Not found");
        return { success: true, message: "ok", data: { ...(snap.data() as Campaign), id: snap.id } };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function saveCampaign(
    id: string | null,
    input: Partial<Campaign>
): Promise<ResponseData<string | null>> {
    try {
        const actor = await requireMarketingAdmin();

        const problem = validateCampaign(input);
        if (problem) throw new Error(problem);

        const data = {
            name: (input.name ?? "").trim(),
            subject: (input.subject ?? "").trim(),
            preheader: (input.preheader ?? "").trim(),
            body: input.body ?? "",
            ctaLabel: (input.ctaLabel ?? "").trim(),
            ctaUrl: (input.ctaUrl ?? "").trim(),
            audience: (input.audience ?? "all") as SegmentId,
            updatedAt: iso(),
        };

        if (id) {
            const existing = await db.collection(CAMPAIGNS).doc(id).get();
            // A sent campaign is a record of what people were told. Editing it
            // afterwards would make the record disagree with their inbox.
            if ((existing.data() as Campaign | undefined)?.status === "sent") {
                throw new Error("That campaign has already been sent — duplicate it instead.");
            }
            await db.collection(CAMPAIGNS).doc(id).update(data);
        } else {
            const ref = await db.collection(CAMPAIGNS).add({
                ...data,
                status: "draft" as const,
                createdBy: actor,
                createdAt: iso(),
            });
            id = ref.id;
        }

        revalidatePath("/app/admin/campaigns");
        return { success: true, message: "Saved", data: id };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteCampaign(id: string): Promise<ResponseData<null>> {
    try {
        await requireMarketingAdmin();
        const snap = await db.collection(CAMPAIGNS).doc(id).get();
        if (!snap.exists) throw new Error("Not found");
        const campaign = snap.data() as Campaign;

        await snap.ref.delete();
        await recordAudit({
            action: "campaign.delete",
            targetId: id,
            targetLabel: campaign.name,
            detail: campaign.status === "sent" ? "deleted a sent campaign" : "deleted a draft",
        });

        revalidatePath("/app/admin/campaigns");
        return { success: true, message: "Deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Sending ───────────────────────────────────────────────────────────── */

function buildMessage(campaign: Campaign, member: AudienceMember, sendId: string | null) {
    const site = siteUrl();
    const ctx = member.context;

    const unsubscribeUrl = `${site}/unsubscribe/${optOutToken(member.uid)}`;
    const openPixelUrl = sendId ? `${site}/api/email/open/${sendId}` : undefined;

    // Clicks go through us so they can be counted, then straight on. The
    // destination is signed into the path rather than taken from a query
    // parameter, so the redirect cannot be pointed at somebody else's site.
    const ctaUrl = campaign.ctaUrl
        ? sendId
            ? `${site}/api/email/click/${sendId}`
            : renderMergeTags(campaign.ctaUrl, ctx)
        : undefined;

    const bodyMarkdown = renderMergeTags(campaign.body, ctx);
    const shell = {
        subject: renderMergeTags(campaign.subject, ctx),
        preheader: renderMergeTags(campaign.preheader ?? "", ctx),
        bodyMarkdown,
        ctaLabel: campaign.ctaLabel ? renderMergeTags(campaign.ctaLabel, ctx) : undefined,
        ctaUrl,
        unsubscribeUrl,
        siteUrl: site,
    };

    return {
        subject: shell.subject,
        html: renderCampaignEmail({ ...shell, openPixelUrl }),
        text: renderCampaignText(shell),
        unsubscribeUrl,
    };
}

/** Send one copy to an address of your choosing, without touching the audience. */
export async function sendTestEmail(
    campaignId: string,
    to: string
): Promise<ResponseData<{ provider: ProviderName } | null>> {
    try {
        await requireMarketingAdmin();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to.trim())) {
            throw new Error("That email address doesn't look right.");
        }

        const snap = await db.collection(CAMPAIGNS).doc(campaignId).get();
        if (!snap.exists) throw new Error("Not found");
        const campaign = { ...(snap.data() as Campaign), id: snap.id };

        // Example values, clearly marked, so a test shows the shape of the mail
        // without implying these numbers belong to whoever receives it.
        const sample: AudienceMember = {
            uid: "test",
            name: "Test Recipient",
            email: to.trim(),
            context: {
                first_name: "Ama", points: "260", tier: "Sprout", next_tier: "Sapling",
                points_to_next: "40", items_listed: "7", items_rehomed: "4", badges: "3",
            },
        };

        const message = buildMessage(campaign, sample, null);
        const result = await sendEmail({ to: sample.email, ...message });
        if (!result.ok) throw new Error(result.error ?? "The provider refused it.");

        return {
            success: true,
            message: result.provider === "dry-run"
                ? "No provider configured — nothing was actually delivered."
                : `Test sent to ${to.trim()}`,
            data: { provider: result.provider },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export interface SendOutcome {
    provider: ProviderName;
    attempted: number;
    sent: number;
    failed: number;
}

/**
 * Send the campaign to everyone currently in its audience.
 *
 * Sequential with a small pause rather than fired in parallel. Every provider
 * rate-limits, and a burst of five hundred is the request that gets the account
 * flagged — the mail is not urgent enough to be worth that.
 */
export async function sendCampaign(id: string): Promise<ResponseData<SendOutcome | null>> {
    try {
        const actor = await requireMarketingAdmin();

        const ref = db.collection(CAMPAIGNS).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Not found");

        const campaign = { ...(snap.data() as Campaign), id };
        if (campaign.status === "sent") throw new Error("That campaign has already been sent.");
        if (campaign.status === "sending") throw new Error("That campaign is already going out.");

        const audience = await resolveAudience(campaign.audience);
        if (!audience.length) throw new Error("Nobody is in that audience right now.");

        await ref.update({ status: "sending", updatedAt: iso() });

        const provider = activeProvider();
        let sent = 0;
        let failed = 0;

        for (const member of audience) {
            // The send row is written first so the open pixel and the click
            // redirect have something to attribute to before the mail lands.
            const sendRef = db.collection(SENDS).doc();
            const record: CampaignSend = {
                campaignId: id,
                uid: member.uid,
                email: member.email,
                name: member.name,
                status: "queued",
            };
            await sendRef.set(record);

            const message = buildMessage(campaign, member, sendRef.id);
            const result = await sendEmail({ to: member.email, ...message });

            if (result.ok) {
                sent += 1;
                await sendRef.update({ status: "sent", sentAt: iso() });
            } else {
                failed += 1;
                await sendRef.update({ status: "failed", reason: result.error ?? "unknown" });
            }

            await new Promise((r) => setTimeout(r, 120));
        }

        await ref.update({
            status: "sent",
            sentAt: iso(),
            recipientCount: audience.length,
            updatedAt: iso(),
        });

        await recordAudit({
            action: "campaign.send",
            targetId: id,
            targetLabel: campaign.name,
            detail: `${sent} sent, ${failed} failed, via ${provider}`,
        });
        void actor;

        revalidatePath("/app/admin/campaigns");
        return {
            success: true,
            message: provider === "dry-run"
                ? `Rehearsed against ${audience.length} recipients — nothing was delivered.`
                : `Sent to ${sent} of ${audience.length}.`,
            data: { provider, attempted: audience.length, sent, failed },
        };
    } catch (error: any) {
        // Leaving it stuck on "sending" would block every future attempt.
        await db.collection(CAMPAIGNS).doc(id).update({ status: "draft" }).catch(() => {});
        return { success: false, message: error.message, data: null };
    }
}

/* ── Analytics ─────────────────────────────────────────────────────────── */

export interface CampaignReport {
    campaign: Campaign;
    stats: CampaignStats;
    recent: CampaignSend[];
}

export async function getCampaignReport(id: string): Promise<ResponseData<CampaignReport | null>> {
    try {
        await requireMarketingAdmin();

        const snap = await db.collection(CAMPAIGNS).doc(id).get();
        if (!snap.exists) throw new Error("Not found");

        const sendsSnap = await db.collection(SENDS).where("campaignId", "==", id).limit(5000).get();
        const sends = sendsSnap.docs.map((d) => ({ ...(d.data() as CampaignSend), id: d.id }));

        return {
            success: true,
            message: "ok",
            data: {
                campaign: { ...(snap.data() as Campaign), id: snap.id },
                stats: computeStats(sends),
                recent: sends
                    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))
                    .slice(0, 50),
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export interface EmailOverview {
    provider: ProviderName;
    providerNote: string;
    campaigns: number;
    totalSent: number;
    optedOut: number;
    /** Averages across sent campaigns, which is the only fair comparison. */
    averageOpenRate: number;
    averageClickRate: number;
}

export async function getEmailOverview(): Promise<ResponseData<EmailOverview | null>> {
    try {
        await requireMarketingAdmin();

        const [campaignsSnap, sendsSnap, optOutsSnap] = await Promise.all([
            db.collection(CAMPAIGNS).limit(500).get(),
            db.collection(SENDS).limit(10000).get(),
            db.collection(OPTOUTS).count().get(),
        ]);

        const sends = sendsSnap.docs.map((d) => d.data() as CampaignSend);
        const byCampaign = new Map<string, CampaignSend[]>();
        sends.forEach((s) => {
            const list = byCampaign.get(s.campaignId) ?? [];
            list.push(s);
            byCampaign.set(s.campaignId, list);
        });

        const rates = Array.from(byCampaign.values())
            .map(computeStats)
            .filter((s) => s.sent > 0);

        const mean = (pick: (s: CampaignStats) => number) =>
            rates.length ? Math.round((rates.reduce((t, s) => t + pick(s), 0) / rates.length) * 10) / 10 : 0;

        const provider = activeProvider();
        return {
            success: true,
            message: "ok",
            data: {
                provider,
                providerNote: providerDescription(provider),
                campaigns: campaignsSnap.size,
                totalSent: sends.filter((s) => s.status === "sent").length,
                optedOut: optOutsSnap.data().count ?? 0,
                averageOpenRate: mean((s) => s.openRate),
                averageClickRate: mean((s) => s.clickRate),
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
