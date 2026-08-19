"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ShieldCheck, BadgeCheck, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";
import { getSegmentCounts, listAllTags, listCrmMembers } from "@/app/app/actions/crm";
import { CrmMemberRow, SEGMENTS, SegmentId, daysSince } from "@/lib/crm";
import { AdminRole, ROLE_LABELS } from "@/lib/roles";
import {
    Badge, Button, EmptyRow, Initials, Input, Num, Panel,
    SkeletonRows, Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 8;

export function CrmDirectory() {
    const [rows, setRows] = useState<CrmMemberRow[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [tags, setTags] = useState<string[]>([]);
    const [segment, setSegment] = useState<SegmentId>("all");
    const [tag, setTag] = useState("");
    const [draft, setDraft] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (q: string, s: SegmentId, t: string) => {
        setLoading(true);
        const res = await listCrmMembers({ search: q, segment: s, tag: t });
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(search, segment, tag) }, [search, segment, tag, load]);

    useEffect(() => {
        getSegmentCounts().then((r) => setCounts(r.data));
        listAllTags().then((r) => setTags(r.data));
    }, []);

    // Typing stays instant; the query catches up.
    useEffect(() => {
        if (draft === search) return;
        const id = setTimeout(() => setSearch(draft), 300);
        return () => clearTimeout(id);
    }, [draft, search]);

    const active = useMemo(() => SEGMENTS.find((s) => s.id === segment), [segment]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
            {/* Segments read as a list of questions worth asking, each with a
                live count so an empty one is obvious before you click it. */}
            <Panel title="Segments" flush className="lg:sticky lg:top-4">
                <nav className="py-1">
                    {SEGMENTS.map((s) => {
                        const on = s.id === segment;
                        const n = counts[s.id];
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSegment(s.id)}
                                title={s.description}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] text-left transition-colors ${
                                    on ? "bg-forest text-white font-semibold" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <span className="truncate">{s.label}</span>
                                {n != null && (
                                    <Num className={`text-[11px] ${on ? "text-lime" : "text-gray-400"}`}>{n}</Num>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </Panel>

            <div className="space-y-3 min-w-0">
                {active && active.id !== "all" && (
                    <p className="text-xs text-gray-500 leading-relaxed">{active.description}</p>
                )}

                <Panel
                    flush
                    title={`${rows.length} member${rows.length === 1 ? "" : "s"}`}
                    actions={
                        <div className="flex items-center gap-2">
                            {tags.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                        aria-label="Filter by tag"
                                        className="bg-white border border-gray-300 rounded-md pl-7 pr-2 py-1.5 text-xs text-ink outline-none focus:border-forest appearance-none"
                                    >
                                        <option value="">All tags</option>
                                        {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <TagIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            )}
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
                            {(tag || search) && (
                                <Button variant="ghost" onClick={() => { setTag(""); setDraft(""); setSearch(""); }}>
                                    <X className="w-3.5 h-3.5" /> Clear
                                </Button>
                            )}
                        </div>
                    }
                >
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Member</Th>
                                    <Th>Tags</Th>
                                    <Th align="right" width="80px">Listed</Th>
                                    <Th align="right" width="90px">Rehomed</Th>
                                    <Th align="right" width="90px">Requests</Th>
                                    <Th align="right" width="90px">Last seen</Th>
                                    <Th align="right" width="70px">Tasks</Th>
                                    <Th align="right" width="70px" />
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <SkeletonRows cols={COLS} />
                                ) : rows.length === 0 ? (
                                    <EmptyRow colSpan={COLS}>No members match this view.</EmptyRow>
                                ) : (
                                    rows.map((m) => {
                                        const quiet = daysSince(m.lastLogin ?? m.createdAt);
                                        return (
                                            <Tr key={m.id} muted={m.suspended}>
                                                <Td>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Initials name={m.name} />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <Link
                                                                    href={`/app/admin/crm/${m.id}`}
                                                                    className="font-semibold text-ink hover:text-forest truncate"
                                                                >
                                                                    {m.name || "Unnamed"}
                                                                </Link>
                                                                {m.verified && (
                                                                    <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                                )}
                                                                {m.role && (
                                                                    <Badge tone="forest">
                                                                        <ShieldCheck className="w-2.5 h-2.5" />
                                                                        {ROLE_LABELS[m.role as AdminRole]}
                                                                    </Badge>
                                                                )}
                                                                {m.suspended && <Badge tone="bad">Suspended</Badge>}
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                                                        </div>
                                                    </div>
                                                </Td>
                                                <Td>
                                                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                        {m.tags.slice(0, 3).map((t) => (
                                                            <Badge key={t} tone="info">{t}</Badge>
                                                        ))}
                                                        {m.tags.length > 3 && (
                                                            <Badge tone="neutral">+{m.tags.length - 3}</Badge>
                                                        )}
                                                    </div>
                                                </Td>
                                                <Td align="right"><Num>{m.listingsCount}</Num></Td>
                                                <Td align="right"><Num>{m.rehomedCount}</Num></Td>
                                                <Td align="right"><Num>{m.requestsCount}</Num></Td>
                                                <Td align="right">
                                                    <Num className={quiet != null && quiet >= 30 ? "text-amber-700" : "text-gray-500"}>
                                                        {quiet == null ? "—" : quiet === 0 ? "today" : `${quiet}d`}
                                                    </Num>
                                                </Td>
                                                <Td align="right">
                                                    {m.openTasks > 0 ? (
                                                        <Badge tone="warn">{m.openTasks}</Badge>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </Td>
                                                <Td align="right">
                                                    <Link href={`/app/admin/crm/${m.id}`}>
                                                        <Button size="xs">Open</Button>
                                                    </Link>
                                                </Td>
                                            </Tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>
                    </TableWrap>
                </Panel>
            </div>
        </div>
    );
}
