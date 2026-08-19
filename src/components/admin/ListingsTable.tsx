"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, Trash2, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminListingRow, listAllListings, removeListing } from "@/app/app/actions/admin";
import EmptyState from "../EmptyState";

type Status = "all" | "available" | "rehomed";

const FILTERS: { id: Status; label: string }[] = [
    { id: "all", label: "All" },
    { id: "available", label: "Available" },
    { id: "rehomed", label: "Rehomed" },
];

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
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-full px-5 py-3 shadow-sm focus-within:border-forest transition-colors">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Search by item or owner…"
                    aria-label="Search listings"
                    className="flex-1 bg-transparent text-sm text-ink placeholder-gray-400 outline-none"
                />
                <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{rows.length}</span>
            </div>

            <div className="flex gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setStatus(f.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                            status === f.id
                                ? "bg-forest text-white border-forest"
                                : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-sand animate-pulse" />)}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState title="No listings" description="Nothing matches this filter." containerClassName="min-h-[200px]" />
            ) : (
                <div className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden">
                    {rows.map((row, i) => (
                        <div
                            key={row.id}
                            className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 ${
                                i !== rows.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-sand overflow-hidden flex-shrink-0">
                                {row.assets?.[0]?.url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={row.assets[0].url} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-ink truncate flex items-center gap-1.5">
                                    {row.name}
                                    {row.donatedTo && (
                                        <span className="bg-primary-light text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                            Rehomed
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {row.ownerName || "Unknown"} · {row.ownerEmail || "—"}
                                    {row.createdAt && ` · ${new Date(row.createdAt).toLocaleDateString()}`}
                                </p>
                            </div>

                            <Link
                                href={`/explore?id=${row.id}`}
                                target="_blank"
                                className="hidden sm:inline-flex items-center gap-1.5 border border-gray-200 text-ink text-xs font-bold px-3.5 py-2 rounded-full hover:border-forest/40 transition-colors flex-shrink-0"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> View
                            </Link>

                            <button
                                onClick={() => remove(row)}
                                disabled={busy === row.id}
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-bold px-3.5 py-2 rounded-full hover:border-red-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                                {busy === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span className="hidden md:inline">Remove</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
