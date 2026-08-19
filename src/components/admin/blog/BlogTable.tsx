"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Trash2, ExternalLink, Plus, Search, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { deletePost, listAllPosts, setPostStatus } from "@/app/app/actions/blog";
import { BlogListItem } from "@/lib/blog";
import {
    Badge, Button, EmptyRow, Input, Num, Panel, Segmented,
    SkeletonRows, Table, TableWrap, Td, Th, Tr,
} from "../ui";

type Filter = "all" | "published" | "draft";
const COLS = 6;

export function BlogTable() {
    const [rows, setRows] = useState<BlogListItem[]>([]);
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listAllPosts();
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const visible = rows.filter(
        (r) =>
            (filter === "all" || r.status === filter) &&
            (!search.trim() || r.title.toLowerCase().includes(search.trim().toLowerCase()))
    );

    const toggle = (row: BlogListItem) => {
        const next = row.status === "published" ? "draft" : "published";
        setBusy(row.id);
        startTransition(async () => {
            const res = await setPostStatus(row.id, next);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const remove = (row: BlogListItem) => {
        if (!window.confirm(`Delete "${row.title}"? This can't be undone.`)) return;
        setBusy(row.id);
        startTransition(async () => {
            const res = await deletePost(row.id);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    return (
        <Panel
            flush
            title={`${visible.length} post${visible.length === 1 ? "" : "s"}`}
            actions={
                <div className="flex items-center gap-2">
                    <Segmented
                        value={filter}
                        options={[
                            { id: "all", label: "All", count: rows.length },
                            { id: "published", label: "Live", count: rows.filter((r) => r.status === "published").length },
                            { id: "draft", label: "Drafts", count: rows.filter((r) => r.status === "draft").length },
                        ]}
                        onChange={setFilter}
                    />
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Title…"
                            aria-label="Search posts"
                            className="pl-7 w-44"
                        />
                    </div>
                    <Link href="/app/admin/blog/new">
                        <Button variant="primary"><Plus className="w-3.5 h-3.5" /> New post</Button>
                    </Link>
                </div>
            }
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th>Post</Th>
                            <Th width="90px">Status</Th>
                            <Th width="150px">Tags</Th>
                            <Th align="right" width="80px">Read</Th>
                            <Th align="right" width="110px">Updated</Th>
                            <Th align="right" width="180px" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows cols={COLS} />
                        ) : visible.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                No posts yet. <Link href="/app/admin/blog/new" className="text-forest font-semibold hover:underline">Write the first one.</Link>
                            </EmptyRow>
                        ) : (
                            visible.map((row) => (
                                <Tr key={row.id}>
                                    <Td>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-10 h-7 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                                {row.coverUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={row.coverUrl} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </span>
                                            <div className="min-w-0">
                                                <Link href={`/app/admin/blog/${row.id}`} className="font-semibold text-ink hover:text-forest truncate block">
                                                    {row.title}
                                                </Link>
                                                <span className="text-xs text-gray-500 truncate block">/blog/{row.slug}</span>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <Badge tone={row.status === "published" ? "good" : "neutral"}>
                                            {row.status === "published" ? "Live" : "Draft"}
                                        </Badge>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap gap-1">
                                            {row.tags.slice(0, 2).map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                                            {row.tags.length > 2 && <Badge>+{row.tags.length - 2}</Badge>}
                                            {!row.tags.length && <span className="text-gray-300">—</span>}
                                        </div>
                                    </Td>
                                    <Td align="right"><Num className="text-gray-500">{row.readingMinutes}m</Num></Td>
                                    <Td align="right" className="text-gray-500 tabular-nums">
                                        {new Date(row.updatedAt).toLocaleDateString()}
                                    </Td>
                                    <Td align="right">
                                        <div className="inline-flex gap-1">
                                            {row.status === "published" && (
                                                <Link href={`/blog/${row.slug}`} target="_blank">
                                                    <Button size="xs"><ExternalLink className="w-3 h-3" /></Button>
                                                </Link>
                                            )}
                                            <Button size="xs" onClick={() => toggle(row)} disabled={busy === row.id}>
                                                {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : row.status === "published" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                {row.status === "published" ? "Unpublish" : "Publish"}
                                            </Button>
                                            <Button size="xs" variant="danger" onClick={() => remove(row)} disabled={busy === row.id}>
                                                <Trash2 className="w-3 h-3" />
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
