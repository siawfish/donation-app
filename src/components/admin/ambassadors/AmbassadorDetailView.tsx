"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Check, Trash2, Save, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import {
    getAmbassador, removeAmbassador, reviewActivity, updateAmbassador,
    type AmbassadorDetail,
} from "@/app/app/actions/ambassadors";
import {
    ACTIVITY_LABELS, AmbassadorStatus, AmbassadorType, HEALTH_LABELS, HEALTH_TONE,
    STATUS_LABELS, TYPE_LABELS, daysSince, displayCode, healthOf, progressPct, referralUrl,
} from "@/lib/ambassadors";
import {
    Badge, Button, EmptyRow, Initials, Input, Num, Panel, Segmented, Select,
    Stat, Table, TableWrap, Td, Th, Tr,
} from "../ui";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";

export function AmbassadorDetailView({ initial }: { initial: AmbassadorDetail }) {
    const [data, setData] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const a = data.ambassador;
    const k = data.kpis;
    const health = healthOf(k, a.targets);

    const [type, setType] = useState<AmbassadorType>(a.type);
    const [territory, setTerritory] = useState(a.territory);
    const [status, setStatus] = useState<AmbassadorStatus>(a.status);
    const [targets, setTargets] = useState(a.targets);
    const [stipend, setStipend] = useState(a.stipend ?? 0);

    const refresh = useCallback(async () => {
        const res = await getAmbassador(a.uid);
        if (res.success && res.data) setData(res.data);
    }, [a.uid]);

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            refresh();
        });
    };

    const link = referralUrl(a.uid, SITE);
    const sinceActivity = daysSince(k.lastActivityAt);

    return (
        <div className="space-y-4">
            {/* Identity */}
            <Panel flush>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <Initials name={a.name} size={44} />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h1 className="text-base font-semibold text-ink truncate">{a.name || "Unnamed"}</h1>
                                <Badge tone="forest">{TYPE_LABELS[a.type]}</Badge>
                                <Badge tone={HEALTH_TONE[health]}>{HEALTH_LABELS[health]}</Badge>
                            </div>
                            <p className="text-[13px] text-gray-500 truncate">{a.email}</p>
                            <p className="text-[13px] text-ink mt-0.5">{a.territory}</p>
                        </div>
                    </div>
                    <Link href={`/app/admin/crm/${a.uid}`}>
                        <Button size="xs">CRM record</Button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-200 [&>*:nth-child(4n)]:border-r-0">
                    <Stat label="Signups" value={k.signups} hint={`${k.signups30d} in 30 days`} />
                    <Stat label="Activated" value={k.activations} hint={`${k.activationRate}% of signups`} />
                    <Stat label="Handovers" value={k.handovers} hint="referred members who completed one" />
                    <Stat
                        label="Logged work"
                        value={k.loggedActivities}
                        hint={sinceActivity == null ? "never" : sinceActivity === 0 ? "today" : `${sinceActivity}d ago`}
                    />
                </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
                <div className="space-y-4 min-w-0">
                    {/* Progress against target */}
                    <Panel title="This month against target">
                        {([
                            ["Signups", k.signups30d, a.targets.signups],
                            ["Activated", k.activations30d, a.targets.activations],
                            ["Handovers", k.handovers30d, a.targets.handovers],
                        ] as const).map(([label, actual, target]) => {
                            const pct = progressPct(actual, target);
                            return (
                                <div key={label} className="mb-3 last:mb-0">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="text-[13px] text-ink">{label}</span>
                                        <Num className="text-[13px] text-gray-500">
                                            <span className="text-ink font-semibold">{actual}</span> / {target}
                                        </Num>
                                    </div>
                                    <div className="h-1.5 rounded-sm bg-gray-100 overflow-hidden">
                                        <div
                                            className={`h-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-forest" : "bg-amber-400"}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </Panel>

                    {/* Logged work */}
                    <Panel flush title={`Logged work (${data.activities.length})`}>
                        <TableWrap>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>What</Th>
                                        <Th width="130px">Kind</Th>
                                        <Th align="right" width="80px">Reach</Th>
                                        <Th align="right" width="100px">Date</Th>
                                        <Th align="right" width="90px" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.activities.length === 0 ? (
                                        <EmptyRow colSpan={5}>Nothing logged yet.</EmptyRow>
                                    ) : (
                                        data.activities.map((act) => (
                                            <Tr key={act.id}>
                                                <Td>
                                                    <span className="font-medium text-ink">{act.title}</span>
                                                    {act.detail && (
                                                        <span className="block text-xs text-gray-500 truncate max-w-md">{act.detail}</span>
                                                    )}
                                                </Td>
                                                <Td className="text-gray-600">{ACTIVITY_LABELS[act.kind]}</Td>
                                                {/* Self-reported, and marked as such — it is not a KPI. */}
                                                <Td align="right" className="text-gray-500">
                                                    <Num>{act.reach || "—"}</Num>
                                                </Td>
                                                <Td align="right" className="text-gray-500 tabular-nums">{act.occurredOn}</Td>
                                                <Td align="right">
                                                    {act.reviewedAt ? (
                                                        <Badge tone="good"><Check className="w-2.5 h-2.5" /> Seen</Badge>
                                                    ) : (
                                                        <Button size="xs" onClick={() => run("act", () => reviewActivity(act.id!))} disabled={busy === "act"}>
                                                            <Eye className="w-3 h-3" /> Mark seen
                                                        </Button>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </TableWrap>
                    </Panel>

                    {/* The people behind the number */}
                    <Panel flush title={`Members they brought in (${data.referred.length})`}
                        description="Every signup attributed to their link — the headline number, inspectable.">
                        <TableWrap>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Member</Th>
                                        <Th width="110px">Activated</Th>
                                        <Th align="right" width="110px">Joined</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.referred.length === 0 ? (
                                        <EmptyRow colSpan={3}>Nobody yet.</EmptyRow>
                                    ) : (
                                        data.referred.slice(0, 25).map((m) => (
                                            <Tr key={m.id}>
                                                <Td>
                                                    <Link href={`/app/admin/crm/${m.id}`} className="text-ink hover:text-forest">
                                                        {m.name || "Unnamed"}
                                                    </Link>
                                                    <span className="block text-xs text-gray-500 truncate">{m.email}</span>
                                                </Td>
                                                <Td>
                                                    {m.activated
                                                        ? <Badge tone="good">Yes</Badge>
                                                        : <Badge tone="neutral">Not yet</Badge>}
                                                </Td>
                                                <Td align="right" className="text-gray-500 tabular-nums">
                                                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </TableWrap>
                    </Panel>
                </div>

                {/* Terms */}
                <div className="space-y-4 min-w-0">
                    <Panel title="Their link" description="Signups through this are attributed automatically.">
                        <code className="block text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 break-all">
                            {link}
                        </code>
                        <p className="text-[11px] text-gray-400 mt-2">
                            Share code: <span className="font-semibold text-ink">{displayCode(a.uid, a.territory)}</span>
                        </p>
                    </Panel>

                    <Panel title="Terms">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Type</label>
                        <div className="mt-1">
                            <Segmented
                                value={type}
                                options={[{ id: "campus" as const, label: "Campus" }, { id: "community" as const, label: "Community" }]}
                                onChange={setType}
                            />
                        </div>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Territory</label>
                        <Input value={territory} onChange={(e) => setTerritory(e.target.value)} className="w-full mt-1" />

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Status</label>
                        <Select value={status} onChange={(e) => setStatus(e.target.value as AmbassadorStatus)} className="w-full mt-1">
                            {(Object.keys(STATUS_LABELS) as AmbassadorStatus[]).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                        </Select>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">
                            Monthly targets
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {(["signups", "activations", "handovers"] as const).map((key) => (
                                <div key={key}>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={targets[key]}
                                        onChange={(e) => setTargets({ ...targets, [key]: Number(e.target.value) })}
                                        aria-label={`${key} target`}
                                        className="w-full"
                                    />
                                    <span className="block text-[10px] text-gray-400 mt-0.5 capitalize">{key}</span>
                                </div>
                            ))}
                        </div>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">
                            Monthly stipend (GHS)
                        </label>
                        <Input
                            type="number"
                            min={0}
                            value={stipend}
                            onChange={(e) => setStipend(Number(e.target.value))}
                            className="w-full mt-1"
                        />

                        <Button
                            variant="primary"
                            className="mt-3 w-full justify-center"
                            disabled={busy === "save"}
                            onClick={() => run("save", () => updateAmbassador(a.uid, { type, territory, status, targets, stipend }))}
                        >
                            {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save terms
                        </Button>
                    </Panel>

                    <Panel title="End the programme">
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Removing them stops attribution from counting toward the programme. Their logged
                            work is kept — it is a record of what was done.
                        </p>
                        <Button
                            variant="danger"
                            className="mt-3 w-full justify-center"
                            disabled={busy === "remove"}
                            onClick={() => {
                                if (!window.confirm(`Remove ${a.name || "this ambassador"} from the programme?`)) return;
                                run("remove", () => removeAmbassador(a.uid));
                            }}
                        >
                            {busy === "remove" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Remove from programme
                        </Button>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
