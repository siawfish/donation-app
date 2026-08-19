"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, ShieldCheck, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
    AdminUserRow,
    grantRole,
    listAdmins,
    listMembers,
    revokeRole,
} from "@/app/app/actions/admin";
import { AdminRole, AdminRoleRecord, ROLE_BLURB, ROLE_LABELS } from "@/lib/roles";
import {
    Badge, Button, EmptyRow, Initials, Input, Panel, Segmented,
    SkeletonRows, Table, TableWrap, Td, Th, Tr,
} from "./ui";

const ASSIGNABLE: AdminRole[] = ["super_admin", "admin", "moderator"];
const COLS = 4;

export function RolesManager({ myUid }: { myUid: string }) {
    const [admins, setAdmins] = useState<AdminRoleRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState("");
    const [results, setResults] = useState<AdminUserRow[]>([]);
    const [role, setRole] = useState<AdminRole>("admin");

    const load = useCallback(async () => {
        const res = await listAdmins();
        if (!res.success) toast.error(res.message);
        setAdmins(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    // Only search once there's enough to narrow on — this reads every member.
    useEffect(() => {
        if (!adding || draft.trim().length < 2) return setResults([]);
        const t = setTimeout(async () => {
            const res = await listMembers({ search: draft });
            setResults(res.data.slice(0, 6));
        }, 300);
        return () => clearTimeout(t);
    }, [draft, adding]);

    const grant = (uid: string) => {
        setBusy(uid);
        startTransition(async () => {
            const res = await grantRole({ uid, role });
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            setAdding(false);
            setDraft("");
            setResults([]);
            load();
        });
    };

    const revoke = (row: AdminRoleRecord) => {
        if (!window.confirm(`Remove ${ROLE_LABELS[row.role]} access from ${row.name || row.email}?`)) return;
        setBusy(row.uid);
        startTransition(async () => {
            const res = await revokeRole(row.uid);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    return (
        <div className="space-y-4">
            {/* What each role can reach — otherwise granting is guesswork. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
                {ASSIGNABLE.map((r) => (
                    <div key={r} className="px-4 py-3 border-r border-gray-200 last:border-r-0">
                        <p className="text-[13px] font-semibold text-ink">{ROLE_LABELS[r]}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{ROLE_BLURB[r]}</p>
                    </div>
                ))}
            </div>

            <Panel
                flush
                title={`${admins.length} admin${admins.length === 1 ? "" : "s"}`}
                actions={
                    <Button variant={adding ? "default" : "primary"} onClick={() => setAdding((v) => !v)}>
                        {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {adding ? "Cancel" : "Add admin"}
                    </Button>
                }
            >
                {adding && (
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 space-y-2.5">
                        <Segmented
                            value={role}
                            options={ASSIGNABLE.map((r) => ({ id: r, label: ROLE_LABELS[r] }))}
                            onChange={setRole}
                        />

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
                                    <div
                                        key={m.id}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 ${i > 0 ? "border-t border-gray-100" : ""}`}
                                    >
                                        <Initials name={m.name} size={24} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-ink truncate">{m.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                                        </div>
                                        <Button size="xs" variant="primary" onClick={() => grant(m.id)} disabled={busy === m.id}>
                                            {busy === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Grant"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {draft.trim().length >= 2 && results.length === 0 && (
                            <p className="text-xs text-gray-400">No members match that.</p>
                        )}
                    </div>
                )}

                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Admin</Th>
                                <Th width="130px">Role</Th>
                                <Th align="right" width="120px">Granted</Th>
                                <Th align="right" width="110px" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows rows={2} cols={COLS} />
                            ) : admins.length === 0 ? (
                                <EmptyRow colSpan={COLS}>No admins yet.</EmptyRow>
                            ) : (
                                admins.map((row) => (
                                    <Tr key={row.uid}>
                                        <Td>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Initials name={row.name} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-ink truncate">
                                                        {row.name || "Unnamed"}
                                                        {row.uid === myUid && (
                                                            <span className="ml-1.5 text-forest font-bold">· you</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{row.email}</p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            <Badge tone="forest">
                                                <ShieldCheck className="w-2.5 h-2.5" />
                                                {ROLE_LABELS[row.role]}
                                            </Badge>
                                        </Td>
                                        <Td align="right" className="text-gray-500 tabular-nums">
                                            {row.grantedAt ? new Date(row.grantedAt).toLocaleDateString() : "—"}
                                        </Td>
                                        <Td align="right">
                                            <Button size="xs" variant="danger" onClick={() => revoke(row)} disabled={busy === row.uid}>
                                                {busy === row.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                Remove
                                            </Button>
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
