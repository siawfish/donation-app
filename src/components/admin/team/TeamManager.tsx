"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    listTeamAdmin, removeTeamMemberRecord, reorderTeamMember, saveTeamMember,
} from "@/app/app/actions/team";
import { BIO_MAX, initialsOf, type TeamMember } from "@/lib/team";
import { Badge, Button, Input, Panel, Textarea } from "../ui";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";

const BLANK: Partial<TeamMember> = {
    name: "", role: "", bio: "", photoUrl: "", linkedin: "", published: true,
};

/**
 * The team page, editable.
 *
 * Order is explicit and moved a step at a time rather than by dragging: this
 * list is half a dozen people, and drag-and-drop on a phone is far more
 * frustrating than two arrows.
 */
export function TeamManager() {
    const [rows, setRows] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<Partial<TeamMember>>(BLANK);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listTeamAdmin();
        if (!res.success) toast.error(res.message);
        setRows(res.data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const set = <K extends keyof TeamMember>(key: K, value: TeamMember[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const openNew = () => { setForm(BLANK); setEditing("new"); };
    const openEdit = (m: TeamMember) => { setForm(m); setEditing(m.id!); };

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            after?.();
            load();
        });
    };

    const save = () =>
        run("form", () => saveTeamMember(editing === "new" ? null : editing, form), () => setEditing(null));

    return (
        <div className="space-y-4">
            <Panel
                flush
                title={`Team page (${rows.length})`}
                description="Shown at /team, in this order."
                actions={
                    <Button variant="primary" onClick={openNew}>
                        <Plus className="w-3.5 h-3.5" /> Add person
                    </Button>
                }
            >
                {loading ? (
                    <p className="text-xs text-gray-500 px-4 py-8 text-center">Loading…</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-gray-500 px-4 py-10 text-center">
                        Nobody added yet — the public team page will show no people until someone is.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {rows.map((m, i) => (
                            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="w-9 h-9 rounded-full bg-forest text-lime text-xs font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {m.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        initialsOf(m.name)
                                    )}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-ink truncate">{m.name}</span>
                                    <span className="block text-[11px] text-gray-500 truncate">{m.role}</span>
                                </span>

                                {!m.published && <Badge tone="neutral">Hidden</Badge>}

                                <span className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        size="xs"
                                        onClick={() => run(`${m.id}-up`, () => reorderTeamMember(m.id!, "up"))}
                                        disabled={i === 0 || busy === `${m.id}-up`}
                                        aria-label={`Move ${m.name} up`}
                                    >
                                        <ArrowUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="xs"
                                        onClick={() => run(`${m.id}-down`, () => reorderTeamMember(m.id!, "down"))}
                                        disabled={i === rows.length - 1 || busy === `${m.id}-down`}
                                        aria-label={`Move ${m.name} down`}
                                    >
                                        <ArrowDown className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="xs"
                                        onClick={() => run(`${m.id}-vis`, () => saveTeamMember(m.id!, { ...m, published: !m.published }))}
                                        disabled={busy === `${m.id}-vis`}
                                        aria-label={m.published ? `Hide ${m.name}` : `Show ${m.name}`}
                                    >
                                        {m.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </Button>
                                    <Button size="xs" onClick={() => openEdit(m)}>Edit</Button>
                                    <Button
                                        size="xs"
                                        variant="danger"
                                        onClick={() => run(`${m.id}-del`, () => removeTeamMemberRecord(m.id!))}
                                        disabled={busy === `${m.id}-del`}
                                        aria-label={`Remove ${m.name}`}
                                    >
                                        {busy === `${m.id}-del` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {editing && (
                <Panel title={editing === "new" ? "Add someone" : `Edit ${form.name || "person"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className={LABEL}>Name</span>
                            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className="w-full mt-1" />
                        </label>
                        <label className="block">
                            <span className={LABEL}>Role</span>
                            <Input value={form.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Head of Logistics" className="w-full mt-1" />
                        </label>
                        <label className="block sm:col-span-2">
                            <span className={LABEL}>Bio</span>
                            <Textarea
                                rows={3}
                                value={form.bio ?? ""}
                                onChange={(e) => set("bio", e.target.value)}
                                className="w-full mt-1"
                            />
                            <span className="text-[11px] text-gray-400 mt-1 block tabular-nums">
                                {(form.bio ?? "").length} / {BIO_MAX}
                            </span>
                        </label>
                        <label className="block">
                            <span className={LABEL}>Photo URL</span>
                            <Input value={form.photoUrl ?? ""} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…" className="w-full mt-1" />
                            <span className="text-[11px] text-gray-400 mt-1 block">Leave empty to show their initials.</span>
                        </label>
                        <label className="block">
                            <span className={LABEL}>LinkedIn</span>
                            <Input value={form.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" className="w-full mt-1" />
                        </label>
                    </div>

                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.published !== false}
                            onChange={(e) => set("published", e.target.checked)}
                        />
                        <span className="text-[13px] text-ink">Show on the public team page</span>
                    </label>

                    <div className="flex items-center gap-2 mt-4">
                        <Button variant="primary" onClick={save} disabled={busy === "form"}>
                            {busy === "form" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save
                        </Button>
                        <Button onClick={() => setEditing(null)} disabled={busy === "form"}>Cancel</Button>
                    </div>
                </Panel>
            )}
        </div>
    );
}
