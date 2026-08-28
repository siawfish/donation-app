"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
    BarChart3, Eye, Loader2, MousePointerClick, Plus, Send, Trash2, TriangleAlert, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
    deleteCampaign, getCampaignReport, getEmailOverview, listCampaigns,
    previewAudience, saveCampaign, sendCampaign, sendTestEmail,
    type CampaignReport, type EmailOverview,
} from "@/app/app/actions/campaigns";
import {
    CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONE, MERGE_TAGS, PRESETS,
    SUBJECT_MAX, renderMergeTags, unknownTags, validateCampaign,
    type Campaign, type CampaignPreset,
} from "@/lib/campaigns";
import { SEGMENTS, type SegmentId } from "@/lib/crm";
import { Badge, Button, Input, Panel, Stat, Textarea } from "../ui";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";

/** Example values, used only to show the admin what a merge tag resolves to. */
const SAMPLE = {
    first_name: "Ama", points: "260", tier: "Sprout", next_tier: "Sapling",
    points_to_next: "40", items_listed: "7", items_rehomed: "4", badges: "3",
};

const BLANK: Partial<Campaign> = {
    name: "", subject: "", preheader: "", body: "", ctaLabel: "", ctaUrl: "", audience: "all",
};

export function CampaignManager() {
    const [overview, setOverview] = useState<EmailOverview | null>(null);
    const [rows, setRows] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<Partial<Campaign>>(BLANK);
    const [audience, setAudience] = useState<{ total: number; suppressed: number; noEmail: number } | null>(null);
    const [report, setReport] = useState<CampaignReport | null>(null);
    const [testTo, setTestTo] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const [list, ov] = await Promise.all([listCampaigns(), getEmailOverview()]);
        if (!list.success) toast.error(list.message);
        setRows(list.data ?? []);
        setOverview(ov.data ?? null);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const set = <K extends keyof Campaign>(key: K, value: Campaign[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const problem = useMemo(
        () => (form.name || form.subject || form.body ? validateCampaign(form) : null),
        [form]
    );

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            after?.();
            load();
        });
    };

    // Refresh the audience count whenever the segment changes, so the number
    // beside the send button is the number that will actually be mailed.
    useEffect(() => {
        if (!editing || !form.audience) return;
        let alive = true;
        previewAudience(form.audience as SegmentId, form.subject ?? "").then((res) => {
            if (alive && res.data) setAudience(res.data);
        });
        return () => { alive = false };
    }, [editing, form.audience, form.subject]);

    const openPreset = (preset: CampaignPreset) => {
        setForm({
            name: preset.name,
            subject: preset.subject,
            preheader: preset.preheader,
            body: preset.body,
            ctaLabel: preset.ctaLabel,
            ctaUrl: `${SITE}${preset.ctaPath}`,
            audience: preset.audience,
        });
        setEditing("new");
    };

    const openReport = (id: string) => {
        setReport(null);
        setEditing(null);
        getCampaignReport(id).then((res) => {
            if (!res.success) { toast.error(res.message); return; }
            setReport(res.data);
        });
    };

    return (
        <div className="space-y-4">
            {/* How email is actually leaving the building. Stated plainly,
                because the difference between "sent" and "rehearsed" is the
                whole meaning of every number underneath it. */}
            {overview && (
                <Panel
                    title="Email"
                    description={overview.providerNote}
                    actions={
                        <Badge tone={overview.provider === "dry-run" ? "warn" : "good"}>
                            {overview.provider === "dry-run" ? "Rehearsal mode" : overview.provider}
                        </Badge>
                    }
                >
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Stat label="Campaigns" value={String(overview.campaigns)} />
                        <Stat label="Emails sent" value={String(overview.totalSent)} />
                        <Stat label="Avg. open rate" value={`${overview.averageOpenRate}%`} />
                        <Stat label="Avg. click rate" value={`${overview.averageClickRate}%`} />
                        <Stat label="Unsubscribed" value={String(overview.optedOut)} />
                    </div>
                </Panel>
            )}

            {!editing && !report && (
                <>
                    <Panel
                        flush
                        title={`Campaigns (${rows.length})`}
                        actions={
                            <Button variant="primary" onClick={() => { setForm(BLANK); setEditing("new"); }}>
                                <Plus className="w-3.5 h-3.5" /> New campaign
                            </Button>
                        }
                    >
                        {loading ? (
                            <p className="text-xs text-gray-500 px-4 py-8 text-center">Loading…</p>
                        ) : rows.length === 0 ? (
                            <p className="text-sm text-gray-500 px-4 py-10 text-center">
                                No campaigns yet. Start from one of the templates below.
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {rows.map((c) => (
                                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] font-semibold text-ink truncate">{c.name}</span>
                                            <span className="block text-[11px] text-gray-500 truncate">{c.subject}</span>
                                        </span>
                                        <Badge tone={CAMPAIGN_STATUS_TONE[c.status]}>
                                            {CAMPAIGN_STATUS_LABELS[c.status]}
                                        </Badge>
                                        {c.recipientCount != null && (
                                            <span className="text-[11px] text-gray-400 tabular-nums">
                                                {c.recipientCount} recipients
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5">
                                            {c.status === "sent" ? (
                                                <Button size="xs" onClick={() => openReport(c.id!)}>
                                                    <BarChart3 className="w-3 h-3" /> Report
                                                </Button>
                                            ) : (
                                                <Button size="xs" onClick={() => { setForm(c); setEditing(c.id!); }}>
                                                    Edit
                                                </Button>
                                            )}
                                            <Button
                                                size="xs"
                                                variant="danger"
                                                onClick={() => run(`${c.id}-del`, () => deleteCampaign(c.id!))}
                                                disabled={busy === `${c.id}-del`}
                                                aria-label={`Delete ${c.name}`}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Retention templates" description="Each one is built round a specific reason to come back.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => openPreset(preset)}
                                    className="text-left border border-gray-200 rounded-lg p-3.5 hover:border-forest/40 transition-colors"
                                >
                                    <span className="block text-[13px] font-semibold text-ink">{preset.name}</span>
                                    <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">
                                        {preset.why}
                                    </span>
                                    <span className="block text-[11px] text-primary font-semibold mt-1.5">
                                        {SEGMENTS.find((s) => s.id === preset.audience)?.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Panel>
                </>
            )}

            {editing && (
                <CampaignEditor
                    form={form}
                    set={set}
                    problem={problem}
                    audience={audience}
                    busy={busy}
                    testTo={testTo}
                    setTestTo={setTestTo}
                    onCancel={() => setEditing(null)}
                    onSave={() =>
                        run("save", () => saveCampaign(editing === "new" ? null : editing, form), () => setEditing(null))
                    }
                    onTest={() => {
                        if (editing === "new") { toast.error("Save it first, then send a test."); return; }
                        run("test", () => sendTestEmail(editing, testTo));
                    }}
                    onSend={() => {
                        if (editing === "new") { toast.error("Save it first."); return; }
                        run("send", () => sendCampaign(editing), () => setEditing(null));
                    }}
                />
            )}

            {report && <CampaignReportView report={report} onBack={() => setReport(null)} />}
        </div>
    );
}

function CampaignEditor({
    form, set, problem, audience, busy, testTo, setTestTo, onCancel, onSave, onTest, onSend,
}: {
    form: Partial<Campaign>;
    set: <K extends keyof Campaign>(key: K, value: Campaign[K]) => void;
    problem: string | null;
    audience: { total: number; suppressed: number; noEmail: number } | null;
    busy: string | null;
    testTo: string;
    setTestTo: (v: string) => void;
    onCancel: () => void;
    onSave: () => void;
    onTest: () => void;
    onSend: () => void;
}) {
    const [confirming, setConfirming] = useState(false);

    const preview = {
        subject: renderMergeTags(form.subject ?? "", SAMPLE),
        body: renderMergeTags(form.body ?? "", SAMPLE),
    };
    const unknown = unknownTags(`${form.subject ?? ""} ${form.body ?? ""}`);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
            <div className="space-y-4">
                <Panel title="Message">
                    <div className="space-y-3">
                        <label className="block">
                            <span className={LABEL}>Campaign name — internal</span>
                            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className="w-full mt-1" />
                        </label>

                        <label className="block">
                            <span className={LABEL}>Subject</span>
                            <Input
                                value={form.subject ?? ""}
                                onChange={(e) => set("subject", e.target.value)}
                                maxLength={SUBJECT_MAX}
                                className="w-full mt-1"
                            />
                            <span className="block text-[11px] text-gray-400 mt-1">
                                Preview: <span className="text-ink">{preview.subject || "—"}</span>
                            </span>
                        </label>

                        <label className="block">
                            <span className={LABEL}>Preheader</span>
                            <Input
                                value={form.preheader ?? ""}
                                onChange={(e) => set("preheader", e.target.value)}
                                placeholder="The grey line after the subject in most inboxes."
                                className="w-full mt-1"
                            />
                        </label>

                        <label className="block">
                            <span className={LABEL}>Body — markdown</span>
                            <Textarea
                                rows={12}
                                value={form.body ?? ""}
                                onChange={(e) => set("body", e.target.value)}
                                className="w-full mt-1 font-mono text-[12px]"
                            />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                                <span className={LABEL}>Button label</span>
                                <Input value={form.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} className="w-full mt-1" />
                            </label>
                            <label className="block">
                                <span className={LABEL}>Button link</span>
                                <Input value={form.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://…" className="w-full mt-1" />
                            </label>
                        </div>

                        {problem && (
                            <p className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2">
                                <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                {problem}
                            </p>
                        )}
                    </div>
                </Panel>

                <Panel title="How it reads" description="With example values in place of the tags.">
                    <p className="text-[13px] font-semibold text-ink">{preview.subject || "No subject yet"}</p>
                    <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed mt-2">
                        {preview.body || "Nothing written yet."}
                    </p>
                    {form.ctaLabel && (
                        <span className="inline-block bg-forest text-lime text-xs font-bold px-4 py-2 rounded-full mt-3">
                            {form.ctaLabel}
                        </span>
                    )}
                </Panel>
            </div>

            <div className="space-y-4">
                <Panel title="Who gets it">
                    <select
                        value={form.audience ?? "all"}
                        onChange={(e) => set("audience", e.target.value as SegmentId)}
                        className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                    >
                        {SEGMENTS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                        {SEGMENTS.find((s) => s.id === (form.audience ?? "all"))?.description}
                    </p>

                    {audience && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                {audience.total} will be emailed
                            </p>
                            {(audience.suppressed > 0 || audience.noEmail > 0) && (
                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                    {audience.suppressed > 0 && <>{audience.suppressed} unsubscribed. </>}
                                    {audience.noEmail > 0 && <>{audience.noEmail} have no address.</>}
                                </p>
                            )}
                        </div>
                    )}
                </Panel>

                <Panel title="Merge tags" description="Click to copy into the message.">
                    <ul className="space-y-1">
                        {MERGE_TAGS.map((t) => (
                            <li key={t.tag}>
                                <button
                                    onClick={() => {
                                        navigator.clipboard?.writeText(`{{${t.tag}}}`).catch(() => {});
                                        toast.success(`Copied {{${t.tag}}}`);
                                    }}
                                    className="w-full text-left flex items-baseline justify-between gap-2 py-1 hover:text-forest"
                                >
                                    <code className="text-[11px] text-forest">{`{{${t.tag}}}`}</code>
                                    <span className="text-[11px] text-gray-400">{t.example}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {unknown.length > 0 && (
                        <p className="text-[11px] text-amber-700 mt-2">
                            Unknown: {unknown.map((u) => `{{${u}}}`).join(", ")}
                        </p>
                    )}
                </Panel>

                <Panel title="Send">
                    <label className="block">
                        <span className={LABEL}>Send a test to</span>
                        <Input
                            type="email"
                            value={testTo}
                            onChange={(e) => setTestTo(e.target.value)}
                            placeholder="you@givny.com"
                            className="w-full mt-1"
                        />
                    </label>
                    <Button className="mt-2 w-full justify-center" onClick={onTest} disabled={busy === "test" || !testTo.trim()}>
                        {busy === "test" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send test
                    </Button>

                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <Button variant="primary" className="w-full justify-center" onClick={onSave} disabled={busy === "save" || !!problem}>
                            {busy === "save" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save draft
                        </Button>
                        {confirming ? (
                            <>
                                <Button
                                    variant="danger"
                                    className="w-full justify-center"
                                    onClick={onSend}
                                    disabled={busy === "send" || !!problem}
                                >
                                    {busy === "send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Yes — email {audience?.total ?? 0} people now
                                </Button>
                                <Button className="w-full justify-center" onClick={() => setConfirming(false)}>
                                    No, not yet
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="danger"
                                className="w-full justify-center"
                                onClick={() => setConfirming(true)}
                                disabled={!!problem || !audience?.total}
                            >
                                <Send className="w-3.5 h-3.5" />
                                Send to {audience?.total ?? 0} people
                            </Button>
                        )}
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            Sending cannot be undone and the campaign becomes read-only afterwards.
                        </p>
                        <Button className="w-full justify-center" onClick={onCancel}>Cancel</Button>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function CampaignReportView({ report, onBack }: { report: CampaignReport; onBack: () => void }) {
    const { campaign, stats, recent } = report;

    return (
        <div className="space-y-4">
            <Panel
                title={campaign.name}
                description={campaign.subject}
                actions={<Button onClick={onBack}>Back</Button>}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Sent" value={String(stats.sent)} />
                    <Stat label="Opened" value={`${stats.opened} · ${stats.openRate}%`} />
                    <Stat label="Clicked" value={`${stats.clicked} · ${stats.clickRate}%`} />
                    <Stat label="Unsubscribed" value={`${stats.unsubscribed} · ${stats.unsubscribeRate}%`} />
                </div>
                {stats.failed > 0 && (
                    <p className="text-xs text-amber-700 mt-3">{stats.failed} failed to send.</p>
                )}
                <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                    Opens are an estimate — Apple Mail pre-loads images for everyone who has privacy
                    protection on, and clients that block images report nothing. Clicks are exact.
                </p>
            </Panel>

            <Panel flush title="Recipients" description={`${recent.length} most recent`}>
                <ul className="divide-y divide-gray-100">
                    {recent.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] text-ink truncate">{s.name || s.email}</span>
                                <span className="block text-[11px] text-gray-400 truncate">{s.email}</span>
                            </span>
                            {s.unsubscribedAt && <Badge tone="bad">Unsubscribed</Badge>}
                            {s.clickedAt && <MousePointerClick className="w-3.5 h-3.5 text-primary" aria-label="Clicked" />}
                            {s.openedAt && <Eye className="w-3.5 h-3.5 text-gray-400" aria-label="Opened" />}
                            {s.status === "failed" && <Badge tone="bad">Failed</Badge>}
                        </li>
                    ))}
                </ul>
            </Panel>
        </div>
    );
}
