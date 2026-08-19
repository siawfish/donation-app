"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
    Loader2, FileText, Trash2, Mail, Phone, ChevronDown, Star, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
    deleteApplication, getResumeUrl, listApplications, rateApplication, setApplicationStage,
} from "@/app/app/actions/jobs";
import {
    ApplicationStage, JobApplication, STAGES, STAGE_LABELS, stageCounts,
} from "@/lib/jobs";
import {
    Badge, Button, EmptyRow, Initials, Num, Panel, Select, SkeletonRows,
    Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 7;

const TONE: Record<string, "neutral" | "info" | "warn" | "good" | "bad"> = Object.fromEntries(
    STAGES.map((s) => [s.id, s.tone])
) as any;

export function ApplicationPipeline({ jobId, canManage }: { jobId?: string; canManage: boolean }) {
    const [rows, setRows] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [stage, setStage] = useState<ApplicationStage | "all">("all");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listApplications(jobId);
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, [jobId]);

    useEffect(() => { load() }, [load]);

    const counts = useMemo(() => stageCounts(rows), [rows]);
    const visible = stage === "all" ? rows : rows.filter((r) => r.stage === stage);

    const move = (row: JobApplication, next: ApplicationStage) => {
        setBusy(row.id!);
        startTransition(async () => {
            const res = await setApplicationStage({ id: row.id!, stage: next });
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(`${row.name} → ${STAGE_LABELS[next]}`);
            load();
        });
    };

    const rate = (row: JobApplication, value: number) => {
        startTransition(async () => {
            const res = await rateApplication(row.id!, value);
            if (!res.success) { toast.error(res.message); return; }
            load();
        });
    };

    const openResume = (row: JobApplication) => {
        setBusy(row.id!);
        startTransition(async () => {
            const res = await getResumeUrl(row.id!);
            setBusy(null);
            if (!res.success || !res.data) { toast.error(res.message); return; }
            window.open(res.data, "_blank", "noopener,noreferrer");
        });
    };

    const remove = (row: JobApplication) => {
        if (!window.confirm(`Delete ${row.name}'s application? Their CV is deleted too.`)) return;
        setBusy(row.id!);
        startTransition(async () => {
            const res = await deleteApplication(row.id!);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    return (
        <div className="space-y-3">
            {/* The funnel doubles as the filter — the counts are the reason you
                click, so they should be the thing you click. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => setStage("all")}
                    className={`px-3 py-2.5 border-r border-b border-gray-200 text-left transition-colors ${
                        stage === "all" ? "bg-forest text-white" : "hover:bg-gray-50"
                    }`}
                >
                    <span className={`block text-[11px] font-semibold uppercase tracking-[0.06em] ${stage === "all" ? "text-lime" : "text-gray-500"}`}>
                        All
                    </span>
                    <Num className="block text-lg font-semibold mt-0.5">{rows.length}</Num>
                </button>
                {STAGES.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setStage(s.id)}
                        className={`px-3 py-2.5 border-r border-b border-gray-200 last:border-r-0 text-left transition-colors ${
                            stage === s.id ? "bg-forest text-white" : "hover:bg-gray-50"
                        }`}
                    >
                        <span className={`block text-[11px] font-semibold uppercase tracking-[0.06em] truncate ${stage === s.id ? "text-lime" : "text-gray-500"}`}>
                            {s.label}
                        </span>
                        <Num className={`block text-lg font-semibold mt-0.5 ${counts[s.id] === 0 && stage !== s.id ? "text-gray-300" : ""}`}>
                            {counts[s.id] ?? 0}
                        </Num>
                    </button>
                ))}
            </div>

            <Panel flush title={`${visible.length} application${visible.length === 1 ? "" : "s"}`}>
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Candidate</Th>
                                {!jobId && <Th width="160px">Role</Th>}
                                <Th width="140px">Stage</Th>
                                <Th align="center" width="110px">Rating</Th>
                                <Th align="right" width="100px">Applied</Th>
                                <Th align="right" width="90px">CV</Th>
                                <Th align="right" width="70px" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows cols={COLS} />
                            ) : visible.length === 0 ? (
                                <EmptyRow colSpan={COLS}>
                                    {rows.length === 0 ? "No applications yet." : "Nothing at this stage."}
                                </EmptyRow>
                            ) : (
                                visible.map((row) => (
                                    <Fragment key={row.id}>
                                        <Tr muted={row.stage === "rejected" || row.stage === "withdrawn"}>
                                            <Td>
                                                <button
                                                    onClick={() => setExpanded(expanded === row.id ? null : row.id!)}
                                                    className="flex items-center gap-2.5 min-w-0 text-left w-full"
                                                >
                                                    <Initials name={row.name} />
                                                    <span className="min-w-0">
                                                        <span className="font-semibold text-ink truncate flex items-center gap-1">
                                                            {row.name}
                                                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${expanded === row.id ? "rotate-180" : ""}`} />
                                                        </span>
                                                        <span className="block text-xs text-gray-500 truncate">{row.email}</span>
                                                    </span>
                                                </button>
                                            </Td>
                                            {!jobId && (
                                                <Td className="text-gray-600 truncate">{row.jobTitle || "—"}</Td>
                                            )}
                                            <Td>
                                                {canManage ? (
                                                    <Select
                                                        value={row.stage}
                                                        onChange={(e) => move(row, e.target.value as ApplicationStage)}
                                                        disabled={busy === row.id}
                                                        aria-label={`Stage for ${row.name}`}
                                                        className="w-full"
                                                    >
                                                        {STAGES.map((s) => (
                                                            <option key={s.id} value={s.id}>{s.label}</option>
                                                        ))}
                                                    </Select>
                                                ) : (
                                                    <Badge tone={TONE[row.stage]}>{STAGE_LABELS[row.stage]}</Badge>
                                                )}
                                            </Td>
                                            <Td align="center">
                                                <span className="inline-flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <button
                                                            key={n}
                                                            onClick={() => canManage && rate(row, row.rating === n ? 0 : n)}
                                                            disabled={!canManage}
                                                            aria-label={`Rate ${n}`}
                                                            className="disabled:cursor-default"
                                                        >
                                                            <Star
                                                                className={`w-3.5 h-3.5 ${
                                                                    (row.rating ?? 0) >= n
                                                                        ? "text-amber-400 fill-amber-400"
                                                                        : "text-gray-200"
                                                                }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </span>
                                            </Td>
                                            <Td align="right" className="text-gray-500 tabular-nums">
                                                {new Date(row.createdAt).toLocaleDateString()}
                                            </Td>
                                            <Td align="right">
                                                {row.resumePath ? (
                                                    <Button size="xs" onClick={() => openResume(row)} disabled={busy === row.id}>
                                                        {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                                        Open
                                                    </Button>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </Td>
                                            <Td align="right">
                                                {canManage && (
                                                    <Button size="xs" variant="danger" onClick={() => remove(row)} disabled={busy === row.id}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </Td>
                                        </Tr>

                                        {expanded === row.id && (
                                            <tr>
                                                <td colSpan={COLS} className="border-b border-gray-200 bg-gray-50/70 px-4 py-3">
                                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1">
                                                                Cover note
                                                            </p>
                                                            <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed">
                                                                {row.coverNote || "— none —"}
                                                            </p>
                                                            <div className="flex flex-wrap gap-3 mt-3 text-[13px]">
                                                                <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
                                                                    <Mail className="w-3.5 h-3.5" /> {row.email}
                                                                </a>
                                                                {row.phone && (
                                                                    <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
                                                                        <Phone className="w-3.5 h-3.5" /> {row.phone}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                                                                History
                                                            </p>
                                                            <ol className="space-y-1">
                                                                {(row.history ?? []).slice().reverse().map((h, i) => (
                                                                    <li key={i} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                                                        <Badge tone={TONE[h.stage]}>{STAGE_LABELS[h.stage]}</Badge>
                                                                        <span className="truncate">
                                                                            {new Date(h.at).toLocaleDateString()} · {h.byName || "system"}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </Table>
                </TableWrap>
            </Panel>
        </div>
    );
}
