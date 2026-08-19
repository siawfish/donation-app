"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, Ban, RotateCcw, Loader2, BadgeCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminUserRow, listMembers, setMemberSuspended } from "@/app/app/actions/admin";
import { AdminRole, ROLE_LABELS } from "@/lib/roles";
import { getInitials } from "@/lib/utils";
import EmptyState from "../EmptyState";

export function MembersTable({ canSuspend }: { canSuspend: boolean }) {
    const [rows, setRows] = useState<AdminUserRow[]>([]);
    const [search, setSearch] = useState("");
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

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
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-full px-5 py-3 shadow-sm focus-within:border-forest transition-colors">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Search by name or email…"
                    aria-label="Search members"
                    className="flex-1 bg-transparent text-sm text-ink placeholder-gray-400 outline-none"
                />
                <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{rows.length}</span>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-sand animate-pulse" />)}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState title="No members found" description="Try a different search." containerClassName="min-h-[200px]" />
            ) : (
                <div className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden">
                    {rows.map((row, i) => (
                        <div
                            key={row.id}
                            className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 ${
                                i !== rows.length - 1 ? "border-b border-gray-100" : ""
                            } ${row.suspended ? "bg-red-50/50" : ""}`}
                        >
                            <span className="w-10 h-10 rounded-full bg-forest text-lime text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {getInitials(row.name || "?")}
                            </span>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-ink truncate flex items-center gap-1.5">
                                    {row.name || "Unnamed"}
                                    {row.verified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                    {row.role && (
                                        <span className="inline-flex items-center gap-1 bg-forest text-lime text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                            <ShieldCheck className="w-2.5 h-2.5" />
                                            {ROLE_LABELS[row.role as AdminRole]}
                                        </span>
                                    )}
                                    {row.suspended && (
                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                            Suspended
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{row.email}</p>
                            </div>

                            <div className="hidden sm:flex items-center gap-5 text-xs text-gray-400 flex-shrink-0">
                                <span className="text-center">
                                    <span className="block text-sm font-bold text-ink tabular-nums">{row.listingsCount}</span>
                                    listed
                                </span>
                                <span className="text-center">
                                    <span className="block text-sm font-bold text-ink tabular-nums">{row.rehomedCount}</span>
                                    rehomed
                                </span>
                            </div>

                            {canSuspend && (
                                <button
                                    onClick={() => toggleSuspend(row)}
                                    disabled={busy === row.id || !!row.role}
                                    title={row.role ? "Remove their admin access first" : undefined}
                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                                        row.suspended
                                            ? "border-gray-200 text-forest hover:border-forest/40"
                                            : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500"
                                    }`}
                                >
                                    {busy === row.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : row.suspended ? (
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    ) : (
                                        <Ban className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden md:inline">{row.suspended ? "Reinstate" : "Suspend"}</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
