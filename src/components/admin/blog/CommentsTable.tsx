"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listAllComments, setCommentHidden, type ModeratedComment } from "@/app/app/actions/blogSocial";
import { Badge, Button, Panel, Segmented, Table, Td, Th, Tr } from "../ui";

type Filter = "all" | "visible" | "hidden";

const when = (iso: string) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/**
 * Comment moderation.
 *
 * Hiding rather than deleting: the row stays, the audit log records who hid it,
 * and it can be put back. A moderator who can quietly erase a comment leaves no
 * way to tell fair moderation from an argument someone lost.
 */
export function CommentsTable() {
    const [rows, setRows] = useState<ModeratedComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listAllComments();
        if (!res.success) toast.error(res.message);
        setRows(res.data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const toggle = (row: ModeratedComment) => {
        setBusy(row.id);
        startTransition(async () => {
            const res = await setCommentHidden(row.id, row.status !== "hidden");
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const shown = rows.filter((r) => filter === "all" || r.status === filter);
    const hiddenCount = rows.filter((r) => r.status === "hidden").length;

    return (
        <Panel
            title="Comments"
            description={`${rows.length} in total${hiddenCount ? ` · ${hiddenCount} hidden` : ""}`}
            actions={
                <Segmented<Filter>
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { id: "all", label: "All", count: rows.length },
                        { id: "visible", label: "Visible" },
                        { id: "hidden", label: "Hidden", count: hiddenCount },
                    ]}
                />
            }
        >
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-10 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading
                </div>
            ) : shown.length === 0 ? (
                <p className="text-sm text-gray-500 px-4 py-10 text-center">
                    {rows.length === 0 ? "Nobody has commented yet." : "Nothing matches that filter."}
                </p>
            ) : (
                <Table>
                    <thead>
                        <Tr>
                            <Th>Comment</Th>
                            <Th>Author</Th>
                            <Th>Post</Th>
                            <Th>When</Th>
                            <Th align="right">Action</Th>
                        </Tr>
                    </thead>
                    <tbody>
                        {shown.map((r) => (
                            <Tr key={r.id}>
                                <Td>
                                    <p className={`text-[13px] leading-relaxed max-w-md ${r.status === "hidden" ? "text-gray-400 line-through" : "text-ink"}`}>
                                        {r.body.length > 220 ? `${r.body.slice(0, 220)}…` : r.body}
                                    </p>
                                    {r.parentId && (
                                        <span className="text-[11px] text-gray-400">in reply to another comment</span>
                                    )}
                                </Td>
                                <Td>{r.authorName}</Td>
                                <Td>
                                    <Link
                                        href={`/blog/${r.postSlug}#comments`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-forest hover:underline"
                                    >
                                        {r.postTitle} <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </Td>
                                <Td>{when(r.createdAt)}</Td>
                                <Td align="right">
                                    <div className="flex items-center gap-2 justify-end">
                                        {r.status === "hidden" && <Badge tone="bad">Hidden</Badge>}
                                        <Button
                                            variant={r.status === "hidden" ? "default" : "danger"}
                                            onClick={() => toggle(r)}
                                            disabled={busy === r.id}
                                        >
                                            {busy === r.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : r.status === "hidden" ? (
                                                <Eye className="w-3.5 h-3.5" />
                                            ) : (
                                                <EyeOff className="w-3.5 h-3.5" />
                                            )}
                                            {r.status === "hidden" ? "Restore" : "Hide"}
                                        </Button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Panel>
    );
}
