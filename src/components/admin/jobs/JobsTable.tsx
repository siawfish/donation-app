"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Trash2, ExternalLink, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteJob, listJobsAdmin } from "@/app/app/actions/jobs";
import { EMPLOYMENT_LABELS, JobListItem, WORK_MODE_LABELS, isAcceptingApplications } from "@/lib/jobs";
import {
    Badge, Button, EmptyRow, Num, Panel, SkeletonRows,
    Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 6;

export function JobsTable({ canManageJobs }: { canManageJobs: boolean }) {
    const [rows, setRows] = useState<JobListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listJobsAdmin();
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const remove = (row: JobListItem) => {
        if (!window.confirm(`Delete "${row.title}"?`)) return;
        setBusy(row.id);
        startTransition(async () => {
            const res = await deleteJob(row.id);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    return (
        <Panel
            flush
            title={`${rows.length} role${rows.length === 1 ? "" : "s"}`}
            actions={
                canManageJobs && (
                    <Link href="/app/admin/jobs/new">
                        <Button variant="primary"><Plus className="w-3.5 h-3.5" /> New role</Button>
                    </Link>
                )
            }
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th>Role</Th>
                            <Th width="110px">Status</Th>
                            <Th width="150px">Type</Th>
                            <Th align="right" width="120px">Applications</Th>
                            <Th align="right" width="110px">Closes</Th>
                            <Th align="right" width="170px" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows cols={COLS} />
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                No roles yet.{" "}
                                {canManageJobs && (
                                    <Link href="/app/admin/jobs/new" className="text-forest font-semibold hover:underline">
                                        Post the first one.
                                    </Link>
                                )}
                            </EmptyRow>
                        ) : (
                            rows.map((row) => {
                                const accepting = isAcceptingApplications(row);
                                return (
                                    <Tr key={row.id} muted={row.status === "closed"}>
                                        <Td>
                                            <Link href={`/app/admin/jobs/${row.id}`} className="font-semibold text-ink hover:text-forest truncate block">
                                                {row.title}
                                            </Link>
                                            <span className="text-xs text-gray-500 truncate block">
                                                {row.department ? `${row.department} · ` : ""}{row.location}
                                            </span>
                                        </Td>
                                        <Td>
                                            {row.status === "open" ? (
                                                <Badge tone={accepting ? "good" : "warn"}>
                                                    {accepting ? "Open" : "Closed to new"}
                                                </Badge>
                                            ) : (
                                                <Badge tone="neutral">{row.status === "draft" ? "Draft" : "Closed"}</Badge>
                                            )}
                                        </Td>
                                        <Td className="text-gray-600 text-xs">
                                            {EMPLOYMENT_LABELS[row.employmentType]} · {WORK_MODE_LABELS[row.workMode]}
                                        </Td>
                                        <Td align="right">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Num className="font-semibold text-ink">{row.applicationCount}</Num>
                                                {row.newCount > 0 && <Badge tone="info">{row.newCount} new</Badge>}
                                            </span>
                                        </Td>
                                        <Td align="right" className="text-gray-500 tabular-nums">
                                            {row.closesOn || "—"}
                                        </Td>
                                        <Td align="right">
                                            <div className="inline-flex gap-1">
                                                <Link href={`/app/admin/jobs/${row.id}`}>
                                                    <Button size="xs"><Users className="w-3 h-3" /> Pipeline</Button>
                                                </Link>
                                                {row.status === "open" && (
                                                    <Link href={`/careers/${row.slug}`} target="_blank">
                                                        <Button size="xs"><ExternalLink className="w-3 h-3" /></Button>
                                                    </Link>
                                                )}
                                                {canManageJobs && (
                                                    <Button size="xs" variant="danger" onClick={() => remove(row)} disabled={busy === row.id}>
                                                        {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                    </Button>
                                                )}
                                            </div>
                                        </Td>
                                    </Tr>
                                );
                            })
                        )}
                    </tbody>
                </Table>
            </TableWrap>
        </Panel>
    );
}
