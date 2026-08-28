"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Ban, RotateCcw, Loader2, BadgeCheck, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminUserRow, listMembers, setMemberSuspended } from "@/app/app/actions/admin";
import { AdminRole, ROLE_LABELS } from "@/lib/roles";
import {
    Badge, Button, EmptyRow, Initials, Input, Num, Panel,
    SkeletonRows, Table, TableWrap, Td, Th, Tr,
} from "./ui";
import { DeleteMemberDialog } from "./DeleteMemberDialog";

export function MembersTable({ canSuspend, canDelete }: { canSuspend: boolean; canDelete: boolean }) {
    const [rows, setRows] = useState<AdminUserRow[]>([]);
    const [search, setSearch] = useState("");
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
    const [, startTransition] = useTransition();

    const cols = 6 + (canSuspend ? 1 : 0) + (canDelete ? 1 : 0);

    const load = useCallback(async (q: string) => {
        const res = await listMembers({ search: q });
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(search) }, [search, load]);

    // Same debounce pattern as Explore: typing stays instant, the query catches up.
    useEffect(() => {
        if (draft === search) return;
        const t = setTimeout(() => setSearch(draft), 300);
        return () => clearTimeout(t);
    }, [draft, search]);

    const toggleSuspend = (row: AdminUserRow) => {
        const next = !row.suspended;
        if (next && !window.confirm(`Suspend ${row.name || "this member"}? They won't be able to use the app.`)) return;
        setBusy(row.id);
        startTransition(async () => {
            const res = await setMemberSuspended({ uid: row.id, suspended: next });
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load(search);
        });
    };

    return (
        <Panel
            flush
            title={`${rows.length} member${rows.length === 1 ? "" : "s"}`}
            actions={
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Name or email…"
                        aria-label="Search members"
                        className="pl-7 w-56"
                    />
                </div>
            }
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th>Member</Th>
                            <Th width="110px">Status</Th>
                            <Th align="right" width="80px">Listed</Th>
                            <Th align="right" width="90px">Rehomed</Th>
                            <Th align="right" width="90px">Role</Th>
                            <Th align="right" width="70px">CRM</Th>
                            {canSuspend && <Th align="right" width="110px" />}
                            {canDelete && <Th align="right" width="90px" />}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows cols={cols} />
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={cols}>No members match that search.</EmptyRow>
                        ) : (
                            rows.map((row) => (
                                <Tr key={row.id} muted={row.suspended}>
                                    <Td>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Initials name={row.name} />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-ink truncate">{row.name || "Unnamed"}</p>
                                                <p className="text-xs text-gray-500 truncate">{row.email}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap gap-1">
                                            {row.verified && (
                                                <Badge tone="good"><BadgeCheck className="w-2.5 h-2.5" /> Verified</Badge>
                                            )}
                                            {row.suspended && <Badge tone="bad">Suspended</Badge>}
                                            {!row.verified && !row.suspended && (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </div>
                                    </Td>
                                    <Td align="right"><Num>{row.listingsCount}</Num></Td>
                                    <Td align="right"><Num>{row.rehomedCount}</Num></Td>
                                    <Td align="right">
                                        {row.role ? (
                                            <Badge tone="forest">
                                                <ShieldCheck className="w-2.5 h-2.5" />
                                                {ROLE_LABELS[row.role as AdminRole]}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </Td>
                                    <Td align="right">
                                        <Link href={`/app/admin/crm/${row.id}`}>
                                            <Button size="xs">Open</Button>
                                        </Link>
                                    </Td>
                                    {canSuspend && (
                                        <Td align="right">
                                            <Button
                                                size="xs"
                                                variant={row.suspended ? "default" : "danger"}
                                                onClick={() => toggleSuspend(row)}
                                                disabled={busy === row.id || !!row.role}
                                                title={row.role ? "Remove their admin access first" : undefined}
                                            >
                                                {busy === row.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : row.suspended ? (
                                                    <RotateCcw className="w-3 h-3" />
                                                ) : (
                                                    <Ban className="w-3 h-3" />
                                                )}
                                                {row.suspended ? "Reinstate" : "Suspend"}
                                            </Button>
                                        </Td>
                                    )}
                                    {canDelete && (
                                        <Td align="right">
                                            <Button
                                                size="xs"
                                                variant="danger"
                                                onClick={() => setDeleting(row)}
                                                disabled={!!row.role}
                                                title={
                                                    row.role
                                                        ? "Remove their admin access first"
                                                        : "Delete this account and everything on it"
                                                }
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Delete
                                            </Button>
                                        </Td>
                                    )}
                                </Tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </TableWrap>

            {deleting && (
                <DeleteMemberDialog
                    member={deleting}
                    onClose={() => setDeleting(null)}
                    onDeleted={() => { setDeleting(null); load(search); }}
                />
            )}
        </Panel>
    );
}
