"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
    Check, Loader2, Pin, PinOff, Plus, Trash2, X,
    Phone, Mail, MessageSquare, Users, CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import {
    addNote, createTask, deleteInteraction, deleteNote, deleteTask,
    getCrmMember, logInteraction, setMemberTags, setTaskStatus, toggleNotePin,
    type CrmMemberDetail,
} from "@/app/app/actions/crm";
import {
    CHANNEL_LABELS, InteractionChannel, SUGGESTED_TAGS,
    isValidTag, normaliseTag, taskUrgency, todayISO,
} from "@/lib/crm";
import {
    Badge, Button, Initials, Input, Num, Panel, Select, Textarea,
} from "../ui";

const CHANNEL_ICON: Record<InteractionChannel, typeof Phone> = {
    call: Phone,
    email: Mail,
    whatsapp: MessageSquare,
    in_person: Users,
    other: CircleDot,
};

const relative = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric",
    });
};

export function MemberWorkspace({
    uid,
    initial,
    canManage,
    assignees,
}: {
    uid: string;
    initial: CrmMemberDetail;
    canManage: boolean;
    assignees: { id: string; name: string }[];
}) {
    const [data, setData] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const refresh = useCallback(async () => {
        const res = await getCrmMember(uid);
        if (res.success && res.data) setData(res.data);
    }, [uid]);

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            after?.();
            refresh();
        });
    };

    const m = data.member;
    if (!m) return null;

    return (
        <div className="space-y-4">
            <IdentityCard detail={data} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
                <div className="space-y-4 min-w-0">
                    <Notes detail={data} canManage={canManage} busy={busy} run={run} uid={uid} />
                    <Interactions detail={data} canManage={canManage} busy={busy} run={run} uid={uid} />
                </div>

                <div className="space-y-4 min-w-0">
                    <Tags detail={data} canManage={canManage} busy={busy} run={run} uid={uid} />
                    <Tasks detail={data} canManage={canManage} busy={busy} run={run} uid={uid} assignees={assignees} />
                    <Activity detail={data} />
                </div>
            </div>
        </div>
    );
}

/* ── Identity ──────────────────────────────────────────────────────────── */

function IdentityCard({ detail }: { detail: CrmMemberDetail }) {
    const m = detail.member!;
    const facts: [string, React.ReactNode][] = [
        ["Joined", relative(m.createdAt)],
        ["Last seen", relative(m.lastLogin)],
        ["Location", detail.locationName || "—"],
        ["Listed", <Num key="l">{m.listingsCount}</Num>],
        ["Rehomed", <Num key="r">{m.rehomedCount}</Num>],
        ["Requests", <Num key="q">{m.requestsCount}</Num>],
    ];

    return (
        <Panel flush>
            <div className="flex items-start gap-3 p-4 pb-3">
                <Initials name={m.name} size={44} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h1 className="text-base font-semibold text-ink truncate">{m.name || "Unnamed"}</h1>
                        {m.verified && <Badge tone="good">Verified</Badge>}
                        {m.suspended && <Badge tone="bad">Suspended</Badge>}
                        {m.role && <Badge tone="forest">{m.role.replace("_", " ")}</Badge>}
                    </div>
                    <p className="text-[13px] text-gray-500 truncate">{m.email}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{m.id}</p>
                </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-gray-200">
                {facts.map(([label, value]) => (
                    <div key={label} className="px-4 py-2.5 border-r border-b border-gray-200 last:border-r-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">{label}</dt>
                        <dd className="text-[13px] text-ink mt-0.5 truncate">{value}</dd>
                    </div>
                ))}
            </dl>
        </Panel>
    );
}

/* ── Tags ──────────────────────────────────────────────────────────────── */

type RunFn = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => void;

function Tags({ detail, canManage, busy, run, uid }: {
    detail: CrmMemberDetail; canManage: boolean; busy: string | null; run: RunFn; uid: string;
}) {
    const tags = detail.member!.tags;
    const [draft, setDraft] = useState("");

    const add = (raw: string) => {
        const t = normaliseTag(raw);
        if (!isValidTag(t)) { toast.error("Tags are 2–24 characters."); return; }
        if (tags.includes(t)) { setDraft(""); return; }
        run("tags", () => setMemberTags(uid, [...tags, t]), () => setDraft(""));
    };

    const unused = SUGGESTED_TAGS.filter((t) => !tags.includes(t));

    return (
        <Panel title="Tags" description="Shared labels used for filtering.">
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                {tags.length === 0 && <p className="text-xs text-gray-400">No tags yet.</p>}
                {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        {t}
                        {canManage && (
                            <button
                                onClick={() => run("tags", () => setMemberTags(uid, tags.filter((x) => x !== t)))}
                                disabled={busy === "tags"}
                                aria-label={`Remove tag ${t}`}
                                className="hover:text-blue-900"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}
            </div>

            {canManage && (
                <>
                    <div className="flex gap-1.5 mt-3">
                        <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
                            placeholder="Add a tag…"
                            aria-label="Add a tag"
                            className="flex-1 min-w-0"
                        />
                        <Button variant="primary" onClick={() => add(draft)} disabled={busy === "tags" || !draft.trim()}>
                            {busy === "tags" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                    {unused.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {unused.slice(0, 6).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => add(t)}
                                    disabled={busy === "tags"}
                                    className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-500 hover:border-forest hover:text-forest transition-colors"
                                >
                                    + {t}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
}

/* ── Notes ─────────────────────────────────────────────────────────────── */

function Notes({ detail, canManage, busy, run, uid }: {
    detail: CrmMemberDetail; canManage: boolean; busy: string | null; run: RunFn; uid: string;
}) {
    const [body, setBody] = useState("");

    return (
        <Panel title="Notes" description="Internal only — never shown to the member.">
            {canManage && (
                <div className="mb-3">
                    <Textarea
                        rows={2}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="What should the next admin know?"
                        aria-label="New note"
                    />
                    <div className="flex justify-end mt-1.5">
                        <Button
                            variant="primary"
                            disabled={!body.trim() || busy === "note"}
                            onClick={() => run("note", () => addNote({ memberId: uid, body }), () => setBody(""))}
                        >
                            {busy === "note" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Add note
                        </Button>
                    </div>
                </div>
            )}

            {detail.notes.length === 0 ? (
                <p className="text-xs text-gray-400">No notes yet.</p>
            ) : (
                <ul className="space-y-2">
                    {detail.notes.map((n) => (
                        <li
                            key={n.id}
                            className={`rounded-md border px-3 py-2 ${
                                n.pinned ? "border-amber-200 bg-amber-50/60" : "border-gray-200 bg-white"
                            }`}
                        >
                            <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed">{n.body}</p>
                            <div className="flex items-center justify-between gap-2 mt-1.5">
                                <p className="text-[11px] text-gray-400">
                                    {n.authorName || "Admin"} · {relative(n.createdAt)}
                                </p>
                                {canManage && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => run("note", () => toggleNotePin(n.id!, uid, !n.pinned))}
                                            className="text-gray-400 hover:text-amber-600"
                                            title={n.pinned ? "Unpin" : "Pin"}
                                        >
                                            {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => window.confirm("Delete this note?") && run("note", () => deleteNote(n.id!, uid))}
                                            className="text-gray-400 hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

/* ── Interactions ──────────────────────────────────────────────────────── */

function Interactions({ detail, canManage, busy, run, uid }: {
    detail: CrmMemberDetail; canManage: boolean; busy: string | null; run: RunFn; uid: string;
}) {
    const [open, setOpen] = useState(false);
    const [channel, setChannel] = useState<InteractionChannel>("call");
    const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
    const [summary, setSummary] = useState("");
    const [occurredAt, setOccurredAt] = useState(todayISO());

    return (
        <Panel
            title="Interaction log"
            description="Conversations that happened outside the app."
            actions={
                canManage && (
                    <Button onClick={() => setOpen((v) => !v)}>
                        {open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {open ? "Cancel" : "Log"}
                    </Button>
                )
            }
        >
            {open && canManage && (
                <div className="mb-3 space-y-2 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex flex-wrap gap-2">
                        <Select value={channel} onChange={(e) => setChannel(e.target.value as InteractionChannel)} aria-label="Channel">
                            {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>
                        <Select value={direction} onChange={(e) => setDirection(e.target.value as any)} aria-label="Direction">
                            <option value="outbound">We contacted them</option>
                            <option value="inbound">They contacted us</option>
                        </Select>
                        <Input type="date" value={occurredAt} max={todayISO()} onChange={(e) => setOccurredAt(e.target.value)} aria-label="Date" />
                    </div>
                    <Textarea
                        rows={2}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="What was discussed?"
                        aria-label="Summary"
                    />
                    <div className="flex justify-end">
                        <Button
                            variant="primary"
                            disabled={!summary.trim() || busy === "interaction"}
                            onClick={() =>
                                run("interaction",
                                    () => logInteraction({ memberId: uid, channel, direction, summary, occurredAt }),
                                    () => { setSummary(""); setOpen(false); })
                            }
                        >
                            {busy === "interaction" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {detail.interactions.length === 0 ? (
                <p className="text-xs text-gray-400">Nothing logged yet.</p>
            ) : (
                <ul className="space-y-0">
                    {detail.interactions.map((it, i) => {
                        const Icon = CHANNEL_ICON[it.channel] ?? CircleDot;
                        return (
                            <li key={it.id} className={`flex gap-2.5 py-2.5 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                                <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-semibold text-ink">
                                            {CHANNEL_LABELS[it.channel]}
                                        </span>
                                        <Badge tone={it.direction === "inbound" ? "info" : "neutral"}>
                                            {it.direction === "inbound" ? "In" : "Out"}
                                        </Badge>
                                        <span className="text-[11px] text-gray-400">{relative(it.occurredAt)}</span>
                                    </div>
                                    <p className="text-[13px] text-ink mt-0.5 whitespace-pre-line leading-relaxed">{it.summary}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Logged by {it.loggedByName || "admin"}</p>
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => window.confirm("Remove this entry?") && run("interaction", () => deleteInteraction(it.id!, uid))}
                                        className="text-gray-300 hover:text-red-500 flex-shrink-0"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

/* ── Tasks ─────────────────────────────────────────────────────────────── */

function Tasks({ detail, canManage, busy, run, uid, assignees }: {
    detail: CrmMemberDetail; canManage: boolean; busy: string | null; run: RunFn; uid: string;
    assignees: { id: string; name: string }[];
}) {
    const [title, setTitle] = useState("");
    const [dueOn, setDueOn] = useState(todayISO());
    const [assignee, setAssignee] = useState("");
    const today = todayISO();

    return (
        <Panel title="Follow-ups">
            {canManage && (
                <div className="space-y-1.5 mb-3">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. check in after failed handover"
                        aria-label="Task title"
                        className="w-full"
                    />
                    <div className="flex gap-1.5">
                        <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label="Due date" className="flex-1 min-w-0" />
                        {assignees.length > 0 && (
                            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assign to" className="flex-1 min-w-0">
                                <option value="">Me</option>
                                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </Select>
                        )}
                        <Button
                            variant="primary"
                            disabled={!title.trim() || busy === "task"}
                            onClick={() => run("task",
                                () => createTask({ memberId: uid, title, dueOn, assigneeId: assignee || undefined }),
                                () => setTitle(""))}
                        >
                            {busy === "task" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>
            )}

            {detail.tasks.length === 0 ? (
                <p className="text-xs text-gray-400">No follow-ups.</p>
            ) : (
                <ul className="space-y-1.5">
                    {detail.tasks.map((t) => {
                        const done = t.status === "done";
                        const urgency = taskUrgency(t.dueOn, today);
                        return (
                            <li key={t.id} className="flex items-start gap-2 rounded-md border border-gray-200 px-2.5 py-2">
                                {canManage && (
                                    <button
                                        onClick={() => run("task", () => setTaskStatus(t.id!, done ? "open" : "done", uid))}
                                        aria-label={done ? "Reopen" : "Mark done"}
                                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                            done ? "bg-forest border-forest text-white" : "border-gray-300 hover:border-forest"
                                        }`}
                                    >
                                        {done && <Check className="w-3 h-3" />}
                                    </button>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[13px] leading-snug ${done ? "text-gray-400 line-through" : "text-ink"}`}>
                                        {t.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {!done && (
                                            <Badge tone={urgency === "overdue" ? "bad" : urgency === "today" ? "warn" : "neutral"}>
                                                {urgency === "today" ? "Today" : t.dueOn}
                                            </Badge>
                                        )}
                                        <span className="text-[11px] text-gray-400 truncate">{t.assigneeName}</span>
                                    </div>
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => window.confirm("Delete this task?") && run("task", () => deleteTask(t.id!, uid))}
                                        className="text-gray-300 hover:text-red-500 flex-shrink-0"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

/* ── Activity ──────────────────────────────────────────────────────────── */

function Activity({ detail }: { detail: CrmMemberDetail }) {
    return (
        <Panel title="Platform activity" description="What they've done on Givny.">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                Listings ({detail.listings.length})
            </p>
            {detail.listings.length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">Never listed anything.</p>
            ) : (
                <ul className="space-y-1 mb-3">
                    {detail.listings.slice(0, 6).map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <Link href={`/explore?id=${l.id}`} target="_blank" className="text-ink hover:text-forest truncate">
                                {l.name}
                            </Link>
                            {l.rehomed ? <Badge tone="good">Rehomed</Badge> : <Badge tone="neutral">Live</Badge>}
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                Requests ({detail.requests.length})
            </p>
            {detail.requests.length === 0 ? (
                <p className="text-xs text-gray-400">Never asked for anything.</p>
            ) : (
                <ul className="space-y-1">
                    {detail.requests.slice(0, 6).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="text-ink truncate">{r.itemName}</span>
                            <Badge tone={r.status === "completed" ? "good" : r.status === "rejected" ? "bad" : "neutral"}>
                                {r.status}
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}
