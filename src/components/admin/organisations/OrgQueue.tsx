"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, ExternalLink, BadgeCheck, Check, X, Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
    listOrganisations, setOrgStatus, setOrgVerified, type OrgRow,
} from "@/app/app/actions/organisations";
import {
    CLAIM_LABELS, ORG_STATUS_LABELS, ORG_STATUS_TONE, ORG_TYPE_LABELS, OrgStatus,
    isUnclaimed,
} from "@/lib/organisations";
import {
    Badge, Button, EmptyRow, Input, Num, Panel, Segmented, SkeletonRows,
    Stat, Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 7;
type Filter = OrgStatus | "all";

export function OrgQueue({ canManage }: { canManage: boolean }) {
    const [rows, setRows] = useState<OrgRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listOrganisations("all");
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

    const totals = useMemo(() => ({
        waiting: rows.filter((r) => r.status === "applied" || r.status === "reviewing").length,
        active: rows.filter((r) => r.status === "active").length,
        rehomed: rows.reduce((n, r) => n + r.impact.rehomed, 0),
        kg: rows.reduce((n, r) => n + r.impact.kgDiverted, 0),
    }), [rows]);

    const act = (id: string, fn: () => Promise<{ success: boolean; message: string }>) => {
        setBusy(id);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const decline = (row: OrgRow) => {
        // A reason is required by the action; ask for it here rather than
        // letting the server reject an empty one.
        const reason = window.prompt(`Why are we declining ${row.name}? They'll be told.`);
        if (reason === null) return;
        if (!reason.trim()) { toast.error("A reason is required."); return; }
        act(row.id!, () => setOrgStatus(row.id!, "rejected", reason));
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-gray-200 rounded-lg overflow-hidden [&>*:nth-child(4n)]:border-r-0">
                <Stat label="Waiting on review" value={totals.waiting} hint="somebody applied and is waiting" />
                <Stat label="Active" value={totals.active} hint="storefronts live" />
                <Stat label="Items passed on" value={totals.rehomed} hint="across all organisations" />
                <Stat label="Diverted" value={`${totals.kg} kg`} hint="estimated, rehomed items only" />
            </div>

            <Panel
                flush
                title={`${visible.length} organisation${visible.length === 1 ? "" : "s"}`}
                actions={
                    <div className="flex items-center gap-2">
                    <Link
                        href="/app/admin/organisations/new"
                        className="inline-flex items-center gap-1.5 rounded-md border border-forest bg-forest px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-dark transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> New organisation
                    </Link>
                    <Segmented
                        value={filter}
                        options={[
                            { id: "all" as Filter, label: "All", count: rows.length },
                            { id: "applied" as Filter, label: "New", count: rows.filter((r) => r.status === "applied").length },
                            { id: "active" as Filter, label: "Active", count: totals.active },
                        ]}
                        onChange={setFilter}
                    />
                    </div>
                }
            >
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Organisation</Th>
                                <Th width="140px">Type</Th>
                                <Th width="110px">Status</Th>
                                <Th align="right" width="90px">Listed</Th>
                                <Th align="right" width="100px">Rehomed</Th>
                                <Th align="right" width="80px">Team</Th>
                                <Th align="right" width="240px" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows cols={COLS} />
                            ) : visible.length === 0 ? (
                                <EmptyRow colSpan={COLS}>
                                    Nothing here. Applications arrive from /for-organisations — or
                                    create a page yourself with “New organisation”.
                                </EmptyRow>
                            ) : (
                                visible.map((row) => (
                                    <Tr key={row.id} muted={row.status === "rejected"}>
                                        <Td>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {row.logoUrl ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={row.logoUrl} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </span>
                                                <div className="min-w-0">
                                                    <Link href={`/app/admin/organisations/${row.id}`} className="font-semibold text-ink hover:text-forest truncate flex items-center gap-1.5">
                                                        {row.name}
                                                        {isUnclaimed(row) && (
                                                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                {CLAIM_LABELS[row.claim ?? "unclaimed"]}
                                                            </span>
                                                        )}
                                                        {row.verified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                    </Link>
                                                    <span className="block text-xs text-gray-500 truncate">{row.contactEmail}</span>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td className="text-gray-600 text-xs">{ORG_TYPE_LABELS[row.type]}</Td>
                                        <Td><Badge tone={ORG_STATUS_TONE[row.status]}>{ORG_STATUS_LABELS[row.status]}</Badge></Td>
                                        <Td align="right"><Num>{row.impact.listed}</Num></Td>
                                        <Td align="right"><Num>{row.impact.rehomed}</Num></Td>
                                        <Td align="right"><Num>{row.teamSize}</Num></Td>
                                        <Td align="right">
                                            <div className="inline-flex gap-1">
                                                {canManage && (row.status === "applied" || row.status === "reviewing") && (
                                                    <>
                                                        <Button size="xs" variant="primary" disabled={busy === row.id}
                                                            onClick={() => act(row.id!, () => setOrgStatus(row.id!, "active"))}>
                                                            {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                            Approve
                                                        </Button>
                                                        <Button size="xs" variant="danger" disabled={busy === row.id} onClick={() => decline(row)}>
                                                            <X className="w-3 h-3" /> Decline
                                                        </Button>
                                                    </>
                                                )}
                                                {canManage && row.status === "active" && !row.verified && (
                                                    <Button size="xs" disabled={busy === row.id}
                                                        onClick={() => act(row.id!, () => setOrgVerified(row.id!, true))}>
                                                        <BadgeCheck className="w-3 h-3" /> Verify
                                                    </Button>
                                                )}
                                                {row.status === "active" && (
                                                    <Link href={`/o/${row.slug}`} target="_blank">
                                                        <Button size="xs"><ExternalLink className="w-3 h-3" /></Button>
                                                    </Link>
                                                )}
                                                <Link href={`/app/admin/organisations/${row.id}`}>
                                                    <Button size="xs">Open</Button>
                                                </Link>
                                            </div>
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </TableWrap>
            </Panel>
        </div>
    );
}
