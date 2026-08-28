"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CornerUpLeft, Loader2, Mail, Phone, Send, Trash2, TriangleAlert, User } from "lucide-react";
import { toast } from "sonner";
import {
    deleteContactMessage, listContactMessages, replyToContactMessage,
    saveContactNotes, setContactStatus,
} from "@/app/app/actions/contact";
import {
    REPLY_MAX, STATUS_LABELS, STATUS_TONE, TOPIC_LABELS, contactPreview, validateReply,
    type ContactMessage, type ContactStatus,
} from "@/lib/contact";
import { Badge, Button, Panel, Segmented, Textarea } from "../ui";

type Filter = ContactStatus | "all";

const when = (iso: string) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/**
 * The contact inbox.
 *
 * A list beside a reading pane rather than a table: these are paragraphs of
 * prose, and a table row truncates the one thing you actually need to read.
 */
export function ContactInbox() {
    const [rows, setRows] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("new");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listContactMessages();
        if (!res.success) toast.error(res.message);
        setRows(res.data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const counts = useMemo(() => ({
        all: rows.length,
        new: rows.filter((r) => r.status === "new").length,
        open: rows.filter((r) => r.status === "open").length,
        resolved: rows.filter((r) => r.status === "resolved").length,
        spam: rows.filter((r) => r.status === "spam").length,
    }), [rows]);

    const visible = useMemo(
        () => rows.filter((r) => (filter === "all" ? r.status !== "spam" : r.status === filter)),
        [rows, filter]
    );

    const selected = rows.find((r) => r.id === selectedId) ?? visible[0] ?? null;

    // Keep the notes box in step with whichever message is open.
    useEffect(() => { setNotes(selected?.notes ?? "") }, [selected?.id, selected?.notes]);

    // Drop any half-written reply when moving to another message. Carrying a
    // draft across threads is how the wrong person gets answered.
    useEffect(() => { setReply("") }, [selected?.id]);

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
            <Panel
                flush
                title="Messages"
                description={`${counts.new} unanswered`}
                actions={
                    <Segmented<Filter>
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { id: "new", label: "New", count: counts.new },
                            { id: "open", label: "Open", count: counts.open },
                            { id: "resolved", label: "Done", count: counts.resolved },
                            { id: "all", label: "All", count: counts.all },
                        ]}
                    />
                }
            >
                {loading ? (
                    <p className="text-xs text-gray-500 px-4 py-8 text-center">Loading…</p>
                ) : visible.length === 0 ? (
                    <p className="text-xs text-gray-500 px-4 py-8 text-center">
                        {filter === "new" ? "Nothing waiting. " : "Nothing here. "}
                        {counts.all === 0 && "Messages from the contact form arrive here."}
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                        {visible.map((row) => (
                            <li key={row.id}>
                                <button
                                    onClick={() => setSelectedId(row.id!)}
                                    className={`w-full text-left px-4 py-3 transition-colors ${
                                        selected?.id === row.id ? "bg-sand" : "hover:bg-gray-50"
                                    }`}
                                >
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="text-[13px] font-semibold text-ink truncate">{row.name}</span>
                                        <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                                    </span>
                                    <span className="block text-[11px] text-gray-500 mt-0.5">
                                        {TOPIC_LABELS[row.topic]} · {when(row.createdAt)}
                                    </span>
                                    <span className="block text-[11px] text-gray-400 mt-1 leading-snug">
                                        {contactPreview(row.message, 70)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {selected ? (
                <div className="space-y-4">
                    <Panel
                        title={selected.name}
                        description={`${TOPIC_LABELS[selected.topic]} · ${when(selected.createdAt)}`}
                        actions={<Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>}
                    >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                            <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
                                <Mail className="w-3.5 h-3.5" /> {selected.email}
                            </a>
                            {selected.phone && (
                                <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
                                    <Phone className="w-3.5 h-3.5" /> {selected.phone}
                                </a>
                            )}
                            {selected.uid && (
                                <span className="inline-flex items-center gap-1.5 text-gray-500">
                                    <User className="w-3.5 h-3.5" /> Signed-in member
                                </span>
                            )}
                            {selected.fromPath && (
                                <span className="text-gray-400">from {selected.fromPath}</span>
                            )}
                        </div>

                        <p className="text-[14px] text-ink leading-relaxed whitespace-pre-line mt-4">
                            {selected.message}
                        </p>

                        {/* What we have already said. Kept on the message so
                            the next person to open it does not answer twice. */}
                        {(selected.replies ?? []).length > 0 && (
                            <ul className="mt-5 space-y-3">
                                {(selected.replies ?? []).map((r, i) => (
                                    <li key={i} className="bg-sand rounded-lg px-4 py-3">
                                        <p className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                            <CornerUpLeft className="w-3 h-3" />
                                            <span className="font-semibold text-ink">{r.sentByName}</span>
                                            <span>{when(r.sentAt)}</span>
                                            {!r.delivered && (
                                                <Badge tone="warn">{r.error ? "Not delivered" : "Not emailed"}</Badge>
                                            )}
                                        </p>
                                        <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed mt-1.5">
                                            {r.body}
                                        </p>
                                        {r.error && (
                                            <p className="text-[11px] text-amber-700 mt-1.5">{r.error}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-5 pt-4 border-t border-gray-100">
                            <label className="block">
                                <span className="flex items-baseline justify-between gap-3">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                                        Reply to {selected.name.split(" ")[0]}
                                    </span>
                                    <span className="text-[11px] text-gray-400 tabular-nums">
                                        {reply.trim().length} / {REPLY_MAX}
                                    </span>
                                </span>
                                <Textarea
                                    rows={5}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder={`Hi ${selected.name.split(" ")[0]},`}
                                    className="w-full mt-1"
                                />
                            </label>

                            {reply.trim() && validateReply(reply) && (
                                <p className="flex items-start gap-1.5 text-[11px] text-amber-800 mt-1.5">
                                    <TriangleAlert className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    {validateReply(reply)}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Button
                                    variant="primary"
                                    onClick={() =>
                                        act(selected.id!, async () => {
                                            const res = await replyToContactMessage(selected.id!, reply);
                                            if (res.success) setReply("");
                                            return res;
                                        })
                                    }
                                    disabled={busy === selected.id || !reply.trim() || !!validateReply(reply)}
                                >
                                    {busy === selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Send reply
                                </Button>
                                <Button
                                    onClick={() =>
                                        act(selected.id!, async () => {
                                            const res = await replyToContactMessage(selected.id!, reply, { resolve: true });
                                            if (res.success) setReply("");
                                            return res;
                                        })
                                    }
                                    disabled={busy === selected.id || !reply.trim() || !!validateReply(reply)}
                                >
                                    Send and resolve
                                </Button>
                                <span className="text-[11px] text-gray-400">
                                    Goes to {selected.email}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                            {selected.status !== "open" && (
                                <Button onClick={() => act(selected.id!, () => setContactStatus(selected.id!, "open"))} disabled={busy === selected.id}>
                                    Mark in progress
                                </Button>
                            )}
                            {selected.status !== "resolved" && (
                                <Button onClick={() => act(selected.id!, () => setContactStatus(selected.id!, "resolved"))} disabled={busy === selected.id}>
                                    Mark resolved
                                </Button>
                            )}
                            {selected.status !== "spam" && (
                                <Button onClick={() => act(selected.id!, () => setContactStatus(selected.id!, "spam"))} disabled={busy === selected.id}>
                                    Spam
                                </Button>
                            )}
                            <Button
                                variant="danger"
                                onClick={() => act(selected.id!, () => deleteContactMessage(selected.id!))}
                                disabled={busy === selected.id}
                            >
                                {busy === selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                            </Button>
                        </div>
                    </Panel>

                    <Panel title="Internal notes" description="Never seen by the sender.">
                        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
                        <Button
                            variant="primary"
                            className="mt-2"
                            onClick={() => act(selected.id!, () => saveContactNotes(selected.id!, notes))}
                            disabled={busy === selected.id}
                        >
                            Save note
                        </Button>
                    </Panel>
                </div>
            ) : (
                <Panel title="Nothing selected">
                    <p className="text-sm text-gray-500">Pick a message on the left.</p>
                </Panel>
            )}
        </div>
    );
}
