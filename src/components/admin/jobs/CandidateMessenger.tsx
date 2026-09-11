"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { sendCandidateMessage, listApplicationMessages } from "@/app/app/actions/candidateMessages";
import { listCareerTemplates } from "@/app/app/actions/emailTemplates";
import {
    CANDIDATE_MERGE_TAGS, CANDIDATE_SUBJECT_MAX,
    PURPOSE_LABELS, PURPOSE_TEMPLATE_KEY, SENDER_MODE_LABELS, renderCandidatePreview,
    validateCandidateMessage,
    type CandidateMessage, type CandidateMessagePurpose, type SenderMode,
} from "@/lib/candidateMessages";
import { JobApplication } from "@/lib/jobs";
import { Badge, Button, Input, Segmented, Select, Textarea } from "../ui";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";

const PURPOSES: CandidateMessagePurpose[] = ["acknowledge", "rejection", "interview", "offer", "other"];

type Draft = { subject: string; body: string };

/**
 * One-to-one candidate email, built on the same editor shape as the campaign
 * manager — a starting draft, a live preview with real values instead of
 * placeholders, and a send button that can't double-fire. Opened as a modal
 * rather than a full-page swap: it's one message, not a document worth
 * navigating to.
 *
 * The starting draft for each purpose comes from Admin → Email templates
 * (the "Careers" group) rather than being written here — edit the wording
 * there and this is what shows up next time, no second copy to keep in sync.
 */
export function CandidateMessenger({
    application,
    onClose,
}: {
    application: JobApplication & { id: string };
    onClose: () => void;
}) {
    const [purpose, setPurpose] = useState<CandidateMessagePurpose>("acknowledge");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [drafts, setDrafts] = useState<Record<CandidateMessagePurpose, Draft> | null>(null);
    const [loadingDrafts, setLoadingDrafts] = useState(true);
    const [senderMode, setSenderMode] = useState<SenderMode>("replyable");
    const [history, setHistory] = useState<CandidateMessage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [busy, startTransition] = useTransition();

    useEffect(() => {
        let alive = true;
        listApplicationMessages(application.id).then((res) => {
            if (!alive) return;
            setHistory(res.data ?? []);
            setLoadingHistory(false);
        });
        return () => { alive = false };
    }, [application.id]);

    // The five careers templates, resolved with whatever an admin has
    // customised — the same content Admin → Email templates shows, so a
    // wording fix there is what lands here next time, not a stale copy.
    useEffect(() => {
        let alive = true;
        listCareerTemplates().then((res) => {
            if (!alive) return;
            if (!res.success) {
                toast.error(res.message);
                setLoadingDrafts(false);
                return;
            }
            const byKey = new Map((res.data ?? []).map((t) => [t.key, t]));
            const map = Object.fromEntries(
                PURPOSES.map((p) => {
                    const t = byKey.get(PURPOSE_TEMPLATE_KEY[p]);
                    return [p, { subject: t?.subject ?? "", body: t?.body ?? "" }];
                })
            ) as Record<CandidateMessagePurpose, Draft>;
            setDrafts(map);
            setSubject(map.acknowledge.subject);
            setBody(map.acknowledge.body);
            setLoadingDrafts(false);
        });
        return () => { alive = false };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose() };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, busy]);

    // Switching purpose swaps in that moment's starting draft — the whole
    // point of the dropdown is not writing "sorry, not this time" from
    // scratch every time. Still just a starting point: everything below
    // stays fully editable afterwards.
    const choosePurpose = (next: CandidateMessagePurpose) => {
        setPurpose(next);
        const draft = drafts?.[next];
        if (draft) { setSubject(draft.subject); setBody(draft.body) }
    };

    const preview = useMemo(
        () => renderCandidatePreview(subject, body, application.name, application.jobTitle ?? ""),
        [subject, body, application.name, application.jobTitle]
    );
    const problem = validateCandidateMessage({ subject, body });

    const send = () => {
        startTransition(async () => {
            const res = await sendCandidateMessage({
                applicationId: application.id,
                purpose,
                subject,
                body,
                senderMode,
            });
            if (!res.success) { toast.error(res.message); return }
            toast.success(res.message);
            setHistory((prev) => (res.data ? [res.data, ...prev] : prev));
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-messenger-title"
            onClick={() => { if (!busy) onClose() }}
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-gray-200 bg-gray-50/70">
                    <div className="min-w-0">
                        <h2 id="candidate-messenger-title" className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            Message {application.name}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {application.email} · {application.jobTitle}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-ink flex-shrink-0" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {loadingDrafts ? (
                    <div className="p-8 flex items-center justify-center text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : (
                <div className="p-5 space-y-4">
                    <label className="block">
                        <span className={LABEL}>Subject / template</span>
                        <Select
                            value={purpose}
                            onChange={(e) => choosePurpose(e.target.value as CandidateMessagePurpose)}
                            className="w-full mt-1"
                        >
                            {PURPOSES.map((p) => (
                                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
                            ))}
                        </Select>
                        <span className="block text-[11px] text-gray-400 mt-1">
                            Fills in a starting subject and message below, from Admin → Email templates — edit either as much as you like.
                        </span>
                    </label>

                    <label className="block">
                        <span className={LABEL}>Subject</span>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            maxLength={CANDIDATE_SUBJECT_MAX}
                            className="w-full mt-1"
                        />
                        <span className="block text-[11px] text-gray-400 mt-1">
                            Preview: <span className="text-ink">{preview.subject || "—"}</span>
                        </span>
                    </label>

                    <label className="block">
                        <span className={LABEL}>Message</span>
                        <Textarea
                            rows={8}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full mt-1"
                        />
                        <span className="block text-[11px] text-gray-400 mt-1">
                            Tags: {CANDIDATE_MERGE_TAGS.map((t) => `{{${t.tag}}}`).join(", ")}
                        </span>
                    </label>

                    <div>
                        <span className={LABEL}>Send from</span>
                        <div className="mt-1">
                            <Segmented
                                value={senderMode}
                                onChange={setSenderMode}
                                options={[
                                    { id: "replyable" as SenderMode, label: "Replyable" },
                                    { id: "no_reply" as SenderMode, label: "No-reply" },
                                ]}
                            />
                        </div>
                        <span className="block text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                            {senderMode === "replyable"
                                ? "A reply lands in careers@givny.com — use this whenever they might reasonably write back."
                                : "Replies go nowhere — use this only for purely informational messages."}
                        </span>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
                        <p className={LABEL}>How it reads</p>
                        <p className="text-[13px] font-semibold text-ink mt-1.5">{preview.subject || "No subject yet"}</p>
                        <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed mt-1.5">
                            {preview.body || "Nothing written yet."}
                        </p>
                    </div>

                    {problem && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2">
                            {problem}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button onClick={onClose} disabled={busy}>Close</Button>
                        <Button variant="primary" onClick={send} disabled={busy || !!problem}>
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send message
                        </Button>
                    </div>

                    {/* What's already gone to this candidate — so a message never
                        gets sent twice just because nobody remembered the last one. */}
                    {!loadingHistory && history.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                            <p className={LABEL}>Sent previously</p>
                            <ul className="mt-1.5 space-y-1.5">
                                {history.map((m) => (
                                    <li key={m.id} className="flex items-center gap-2 text-[12px]">
                                        <Badge tone={m.status === "sent" ? "good" : "bad"}>
                                            {PURPOSE_LABELS[m.purpose]}
                                        </Badge>
                                        <span className="text-gray-500 truncate flex-1">{m.subject}</span>
                                        <span className="text-gray-400 flex-shrink-0">
                                            {new Date(m.sentAt).toLocaleDateString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}
