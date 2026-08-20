"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { listAudit } from "@/app/app/actions/audit";
import {
    AUDIT_LABELS, AUDIT_SEVERITY, AuditEntry, SEVERITY_TONE,
} from "@/lib/audit";
import {
    Badge, EmptyRow, Initials, Input, Panel, Select, SkeletonRows,
    Table, TableWrap, Td, Th, Tr,
} from "./ui";

const COLS = 5;

const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function AuditLog() {
    const [rows, setRows] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState("");
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const res = await listAudit({ action });
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, [action]);

    useEffect(() => { load() }, [load]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                (r.actorName ?? "").toLowerCase().includes(q) ||
                (r.targetLabel ?? "").toLowerCase().includes(q) ||
                (r.detail ?? "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    return (
        <Panel
            flush
            title={`${visible.length} entr${visible.length === 1 ? "y" : "ies"}`}
            description="Append-only. Entries are never edited or removed."
            actions={
                <div className="flex items-center gap-2">
                    <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
                        <option value="">All actions</option>
                        {Object.entries(AUDIT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </Select>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Who or what…"
                            aria-label="Search the log"
                            className="pl-7 w-48"
                        />
                    </div>
                </div>
            }
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th width="150px">Admin</Th>
                            <Th width="190px">Action</Th>
                            <Th>Target</Th>
                            <Th>Detail</Th>
                            <Th align="right" width="140px">When</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows cols={COLS} />
                        ) : visible.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                {rows.length === 0
                                    ? "Nothing recorded yet. Admin actions appear here as they happen."
                                    : "Nothing matches that."}
                            </EmptyRow>
                        ) : (
                            visible.map((e) => (
                                <Tr key={e.id}>
                                    <Td>
                                        <span className="flex items-center gap-2 min-w-0">
                                            <Initials name={e.actorName} size={22} />
                                            <span className="truncate text-ink">{e.actorName || "Admin"}</span>
                                        </span>
                                    </Td>
                                    <Td>
                                        <Badge tone={SEVERITY_TONE[AUDIT_SEVERITY[e.action] ?? "info"]}>
                                            {AUDIT_LABELS[e.action] ?? e.action}
                                        </Badge>
                                    </Td>
                                    <Td className="text-ink">
                                        {/* Label captured at write time, so this still reads
                                            correctly after the target was deleted. */}
                                        {e.targetId && e.targetLabel ? (
                                            <Link href={`/app/admin/crm/${e.targetId}`} className="hover:text-forest truncate block">
                                                {e.targetLabel}
                                            </Link>
                                        ) : (
                                            <span className="truncate block">{e.targetLabel || "—"}</span>
                                        )}
                                    </Td>
                                    <Td className="text-gray-500 truncate max-w-[220px]">{e.detail || "—"}</Td>
                                    <Td align="right" className="text-gray-500 tabular-nums whitespace-nowrap">
                                        {when(e.createdAt)}
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </TableWrap>
        </Panel>
    );
}
