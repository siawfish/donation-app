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
import { getInitials } from "@/lib/utils";

const ASSIGNABLE: AdminRole[] = ["super_admin", "admin", "moderator"];

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

    const grant = (uid: string, name?: string) => {
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
        <div className="space-y-5">
            {/* What each role can reach — otherwise granting is guesswork. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ASSIGNABLE.map((r) => (
                    <div key={r} className="bg-white border border-gray-200/70 rounded-3xl p-4">
                        <p className="text-sm font-bold text-ink">{ROLE_LABELS[r]}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ROLE_BLURB[r]}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                    <p className="text-sm font-bold text-ink">
                        {admins.length} admin{admins.length === 1 ? "" : "s"}
                    </p>
                    <button
                        onClick={() => setAdding((v) => !v)}
                        className="inline-flex items-center gap-1.5 bg-forest text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-forest-dark transition-colors"
                    >
                        {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {adding ? "Cancel" : "Add admin"}
                    </button>
                </div>

                {adding && (
                    <div className="px-5 py-4 border-b border-gray-100 bg-sand/40 space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {ASSIGNABLE.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                        role === r
                                            ? "bg-forest text-white border-forest"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                    }`}
                                >
                                    {ROLE_LABELS[r]}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-full px-4 py-2.5">
                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder="Find a member by name or email…"
                                aria-label="Find a member"
                                className="flex-1 bg-transparent text-sm text-ink placeholder-gray-400 outline-none"
                            />
                        </div>

                        {results.length > 0 && (
                            <div className="space-y-1.5">
                                {results.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2 border border-gray-200/70">
                                        <span className="w-8 h-8 rounded-full bg-forest text-lime text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                            {getInitials(m.name || "?")}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-ink truncate">{m.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{m.email}</p>
                                        </div>
                                        <button
                                            onClick={() => grant(m.id, m.name)}
                                            disabled={busy === m.id}
                                            className="bg-lime text-forest text-xs font-bold px-4 py-2 rounded-full hover:brightness-95 transition-all flex-shrink-0 disabled:opacity-50"
                                        >
                                            {busy === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Make ${ROLE_LABELS[role].toLowerCase()}`}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {draft.trim().length >= 2 && results.length === 0 && (
                            <p className="text-xs text-gray-400">No members match that.</p>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="p-5 space-y-2">
                        {[...Array(2)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-sand animate-pulse" />)}
                    </div>
                ) : (
                    admins.map((row, i) => (
                        <div
                            key={row.uid}
                            className={`flex items-center gap-3 px-5 py-3.5 ${i !== admins.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                            <span className="w-10 h-10 rounded-full bg-forest text-lime text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {getInitials(row.name || "?")}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-ink truncate flex items-center gap-1.5">
                                    {row.name || "Unnamed"}
                                    {row.uid === myUid && <span className="text-primary font-extrabold">· you</span>}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{row.email}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 bg-forest text-lime text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {ROLE_LABELS[row.role]}
                            </span>
                            <button
                                onClick={() => revoke(row)}
                                disabled={busy === row.uid}
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-bold px-3.5 py-2 rounded-full hover:border-red-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                                {busy === row.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                <span className="hidden md:inline">Remove</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
