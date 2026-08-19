"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, X, GraduationCap, MapPin } from "lucide-react";
import { toast } from "sonner";
import { addAmbassador, listAmbassadors, type AmbassadorRow } from "@/app/app/actions/ambassadors";
import { listMembers, type AdminUserRow } from "@/app/app/actions/admin";
import {
    AmbassadorType, DEFAULT_TARGETS, HEALTH_LABELS, HEALTH_TONE, STATUS_LABELS, STATUS_TONE,
    TYPE_LABELS, healthOf, progressPct,
} from "@/lib/ambassadors";
import {
    Badge, Button, EmptyRow, Initials, Input, Num, Panel, Segmented, SkeletonRows,
    Stat, Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 8;
type Filter = "all" | "campus" | "town";

/** Progress bar sized to a monthly target. */
function Bar({ actual, target }: { actual: number; target: number }) {
    const pct = progressPct(actual, target);
    return (
        <div className="flex items-center gap-2 justify-end">
            <div className="w-14 h-1.5 rounded-sm bg-gray-100 overflow-hidden flex-shrink-0">
                <div
                    className={`h-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-forest" : "bg-amber-400"}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <Num className="text-[13px] w-12 text-right">
                {actual}
                <span className="text-gray-400">/{target}</span>
            </Num>
        </div>
    );
}

export function AmbassadorRoster({ canManage }: { canManage: boolean }) {
    const [rows, setRows] = useState<AmbassadorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [adding, setAdding] = useState(false);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listAmbassadors();
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const visible = filter === "all" ? rows : rows.filter((r) => r.type === filter);

    // Programme-level totals, so the first thing an admin sees is whether the
    // channel is working at all — not thirty individual rows.
    const totals = useMemo(() => {
        const active = rows.filter((r) => r.status === "active");
        return {
            active: active.length,
            signups30d: rows.reduce((n, r) => n + r.kpis.signups30d, 0),
            activations30d: rows.reduce((n, r) => n + r.kpis.activations30d, 0),
            dormant: active.filter((r) => healthOf(r.kpis, r.targets) === "dormant").length,
        };
    }, [rows]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-gray-200 rounded-lg overflow-hidden [&>*:nth-child(4n)]:border-r-0">
                <Stat label="Active ambassadors" value={totals.active} hint={`${rows.length} on the roster`} />
                <Stat label="Signups · 30d" value={totals.signups30d} hint="attributed to referral links" />
                <Stat label="Activated · 30d" value={totals.activations30d} hint="went on to list or ask" />
                <Stat label="Dormant" value={totals.dormant} hint="no signups, no logged work" />
            </div>

            <Panel
                flush
                title={`${visible.length} ambassador${visible.length === 1 ? "" : "s"}`}
                actions={
                    <div className="flex items-center gap-2">
                        <Segmented
                            value={filter}
                            options={[
                                { id: "all", label: "All", count: rows.length },
                                { id: "campus", label: "Campus", count: rows.filter((r) => r.type === "campus").length },
                                { id: "town", label: "Town", count: rows.filter((r) => r.type === "town").length },
                            ]}
                            onChange={setFilter}
                        />
                        {canManage && (
                            <Button variant={adding ? "default" : "primary"} onClick={() => setAdding((v) => !v)}>
                                {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                {adding ? "Cancel" : "Add"}
                            </Button>
                        )}
                    </div>
                }
            >
                {adding && canManage && <AddForm onDone={() => { setAdding(false); load(); }} />}

                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Ambassador</Th>
                                <Th width="130px">Territory</Th>
                                <Th width="100px">Status</Th>
                                <Th width="100px">Health</Th>
                                <Th align="right" width="150px">Signups · 30d</Th>
                                <Th align="right" width="150px">Activated · 30d</Th>
                                <Th align="right" width="90px">Act. rate</Th>
                                <Th align="right" width="70px" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows cols={COLS} />
                            ) : visible.length === 0 ? (
                                <EmptyRow colSpan={COLS}>
                                    No ambassadors yet. Add a member to start the programme.
                                </EmptyRow>
                            ) : (
                                visible.map((row) => {
                                    const health = healthOf(row.kpis, row.targets);
                                    return (
                                        <Tr key={row.uid} muted={row.status === "ended"}>
                                            <Td>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Initials name={row.name} />
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/app/admin/ambassadors/${row.uid}`}
                                                            className="font-semibold text-ink hover:text-forest truncate block"
                                                        >
                                                            {row.name || "Unnamed"}
                                                        </Link>
                                                        <span className="text-xs text-gray-500 truncate block">{row.email}</span>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td>
                                                <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">
                                                    {row.type === "campus"
                                                        ? <GraduationCap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                        : <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                    <span className="truncate">{row.territory}</span>
                                                </span>
                                            </Td>
                                            <Td><Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge></Td>
                                            <Td><Badge tone={HEALTH_TONE[health]}>{HEALTH_LABELS[health]}</Badge></Td>
                                            <Td align="right"><Bar actual={row.kpis.signups30d} target={row.targets.signups} /></Td>
                                            <Td align="right"><Bar actual={row.kpis.activations30d} target={row.targets.activations} /></Td>
                                            <Td align="right">
                                                <Num className={row.kpis.activationRate >= 40 ? "text-emerald-700" : "text-gray-600"}>
                                                    {row.kpis.activationRate}%
                                                </Num>
                                            </Td>
                                            <Td align="right">
                                                <Link href={`/app/admin/ambassadors/${row.uid}`}>
                                                    <Button size="xs">Open</Button>
                                                </Link>
                                            </Td>
                                        </Tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </TableWrap>
            </Panel>
        </div>
    );
}

/* ── Add ───────────────────────────────────────────────────────────────── */

function AddForm({ onDone }: { onDone: () => void }) {
    const [draft, setDraft] = useState("");
    const [results, setResults] = useState<AdminUserRow[]>([]);
    const [picked, setPicked] = useState<AdminUserRow | null>(null);
    const [type, setType] = useState<AmbassadorType>("campus");
    const [territory, setTerritory] = useState("");
    const [busy, setBusy] = useState(false);
    const [, startTransition] = useTransition();

    // Only search once there is something to narrow on — this reads every member.
    useEffect(() => {
        if (picked || draft.trim().length < 2) return setResults([]);
        const t = setTimeout(async () => {
            const res = await listMembers({ search: draft });
            setResults(res.data.slice(0, 5));
        }, 300);
        return () => clearTimeout(t);
    }, [draft, picked]);

    const submit = () => {
        if (!picked) return;
        setBusy(true);
        startTransition(async () => {
            const res = await addAmbassador({
                uid: picked.id, type, territory, targets: DEFAULT_TARGETS,
            });
            setBusy(false);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            onDone();
        });
    };

    return (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 space-y-2.5">
            {picked ? (
                <div className="flex items-center gap-2.5">
                    <Initials name={picked.name} size={24} />
                    <span className="text-[13px] font-medium text-ink">{picked.name}</span>
                    <span className="text-xs text-gray-500">{picked.email}</span>
                    <button onClick={() => { setPicked(null); setDraft(""); }} aria-label="Choose someone else">
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative max-w-sm">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Find a member by name or email…"
                            aria-label="Find a member"
                            className="pl-7 w-full"
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="border border-gray-200 rounded-md overflow-hidden bg-white max-w-sm">
                            {results.map((m, i) => (
                                <button
                                    key={m.id}
                                    onClick={() => setPicked(m)}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
                                >
                                    <Initials name={m.name} size={24} />
                                    <span className="min-w-0">
                                        <span className="block text-[13px] font-medium text-ink truncate">{m.name}</span>
                                        <span className="block text-xs text-gray-500 truncate">{m.email}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {picked && (
                <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                        value={type}
                        options={[{ id: "campus" as const, label: "Campus" }, { id: "town" as const, label: "Town" }]}
                        onChange={setType}
                    />
                    <Input
                        value={territory}
                        onChange={(e) => setTerritory(e.target.value)}
                        placeholder={type === "campus" ? "e.g. KNUST" : "e.g. Dansoman"}
                        aria-label="Territory"
                        className="w-48"
                    />
                    <Button variant="primary" onClick={submit} disabled={busy || !territory.trim()}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Add to programme
                    </Button>
                </div>
            )}
        </div>
    );
}
