"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, Trash2, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminListingRow, listAllListings, removeListing } from "@/app/app/actions/admin";
import {
    Badge, Button, EmptyRow, Input, Panel, Segmented,
    SkeletonRows, Table, TableWrap, Td, Th, Tr,
} from "./ui";

type Status = "all" | "available" | "rehomed";

const FILTERS: { id: Status; label: string }[] = [
    { id: "all", label: "All" },
    { id: "available", label: "Available" },
    { id: "rehomed", label: "Rehomed" },
];

const COLS = 5;

export function ListingsTable() {
    const [rows, setRows] = useState<AdminListingRow[]>([]);
    const [status, setStatus] = useState<Status>("all");
    const [draft, setDraft] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async (q: string, s: Status) => {
        const res = await listAllListings({ search: q, status: s });
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(search, status) }, [search, status, load]);

    useEffect(() => {
        if (draft === search) return;
        const t = setTimeout(() => setSearch(draft), 300);
        return () => clearTimeout(t);
    }, [draft, search]);

    const remove = (row: AdminListingRow) => {
        if (!window.confirm(`Remove "${row.name}"? This also deletes its requests, saves and views. It can't be undone.`)) return;
        setBusy(row.id!);
        startTransition(async () => {
            const res = await removeListing(row.id!);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load(search, status);
        });
    };

    return (
        <Panel
            flush
            title={`${rows.length} listing${rows.length === 1 ? "" : "s"}`}
            actions={
                <div className="flex items-center gap-2">
                    <Segmented value={status} options={FILTERS} onChange={setStatus} />
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Item or owner…"
                            aria-label="Search listings"
                            className="pl-7 w-52"
                        />
                    </div>
                </div>
            }
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th>Item</Th>
                            <Th>Owner</Th>
                            <Th width="100px">Status</Th>
                            <Th align="right" width="100px">Listed</Th>
                            <Th align="right" width="140px" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows cols={COLS} />
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>Nothing matches this filter.</EmptyRow>
                        ) : (
                            rows.map((row) => (
                                <Tr key={row.id}>
                                    <Td>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                                {row.assets?.[0]?.url && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={row.assets[0].url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </span>
                                            <span className="font-semibold text-ink truncate">{row.name}</span>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="min-w-0">
                                            {row.createdBy ? (
                                                <Link
                                                    href={`/app/admin/crm/${row.createdBy}`}
                                                    className="text-ink hover:text-forest truncate block"
                                                >
                                                    {row.ownerName || "Unknown"}
                                                </Link>
                                            ) : (
                                                <span className="text-ink truncate block">{row.ownerName || "Unknown"}</span>
                                            )}
                                            <span className="text-xs text-gray-500 truncate block">{row.ownerEmail || "—"}</span>
                                        </div>
                                    </Td>
                                    <Td>
                                        {row.donatedTo ? <Badge tone="good">Rehomed</Badge> : <Badge tone="neutral">Live</Badge>}
                                    </Td>
                                    <Td align="right" className="text-gray-500 tabular-nums">
                                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                                    </Td>
                                    <Td align="right">
                                        <div className="inline-flex gap-1">
                                            <Link href={`/explore?id=${row.id}`} target="_blank">
                                                <Button size="xs"><ExternalLink className="w-3 h-3" /> View</Button>
                                            </Link>
                                            <Button size="xs" variant="danger" onClick={() => remove(row)} disabled={busy === row.id}>
                                                {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                Remove
                                            </Button>
                                        </div>
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
