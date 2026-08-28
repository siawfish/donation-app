"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Mail, RotateCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import {
    InviteOutcome, inviteMembers, listMemberInvites, resendMemberInvite, revokeMemberInvite,
} from "@/app/app/actions/memberInvites";
import { MAX_PER_BATCH, MemberInvite, inviteExpired, parseEmails } from "@/lib/memberInvites";
import { Badge, Button, EmptyRow, Panel, SkeletonRows, Table, TableWrap, Td, Textarea, Th, Tr } from "./ui";

function when(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The four buckets an address can land in, spelled out rather than counted. */
function Outcome({ result, onDismiss }: { result: InviteOutcome; onDismiss: () => void }) {
    const groups = ([
        { label: "Sent", tone: "good", list: result.sent },
        { label: "Already a member", tone: "neutral", list: result.alreadyMembers },
        { label: "Already invited", tone: "warn", list: result.alreadyInvited },
        { label: "Not a valid address", tone: "bad", list: result.unusable },
    ] as const).filter((g) => g.list.length > 0);

    return (
        <div className="border border-gray-200 rounded-md bg-sand/40 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">What happened</p>
                <button onClick={onDismiss} aria-label="Dismiss" className="text-gray-400 hover:text-ink">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            {groups.map((g) => (
                <div key={g.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Badge tone={g.tone}>{g.label} · {g.list.length}</Badge>
                    <span className="text-[11px] text-gray-500 break-all">{g.list.join(", ")}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Invite people to join, by email.
 *
 * Takes a paste rather than one address at a time — the realistic input is a
 * column out of a spreadsheet or a list somebody typed in WhatsApp, and asking
 * an admin to enter forty addresses in forty boxes is asking them not to
 * bother.
 */
export function InviteMembers() {
    const [emails, setEmails] = useState("");
    const [note, setNote] = useState("");
    const [rows, setRows] = useState<MemberInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [result, setResult] = useState<InviteOutcome | null>(null);
    const [sending, startSending] = useTransition();

    const load = useCallback(async () => {
        const res = await listMemberInvites();
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    // Counted as you type, so nobody discovers they pasted 80 addresses only
    // after pressing send.
    const { valid, invalid } = parseEmails(emails);
    const tooMany = valid.length > MAX_PER_BATCH;

    const send = () => {
        startSending(async () => {
            const res = await inviteMembers({ emails, note });
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            setResult(res.data);
            if (res.data?.sent.length) { setEmails(""); setNote(""); }
            load();
        });
    };

    const act = (id: string, fn: (id: string) => Promise<{ success: boolean; message: string }>) => {
        setBusy(id);
        fn(id).then((res) => {
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const pending = rows.filter((r) => r.status === "pending" && !inviteExpired(r)).length;
    const accepted = rows.filter((r) => r.status === "accepted").length;

    return (
        <div className="space-y-3">
            <Panel
                title="Invite people to join"
                description={`Paste addresses separated by commas, spaces or new lines — up to ${MAX_PER_BATCH} at a time. Anyone who already has an account is skipped.`}
            >
                <div className="space-y-2.5">
                    <Textarea
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        rows={3}
                        placeholder="ama@example.com, kofi@example.com"
                        aria-label="Email addresses"
                    />

                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 240))}
                        rows={2}
                        placeholder="Optional — a line from you, shown in the email"
                        aria-label="Note"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-gray-500">
                            {valid.length === 0
                                ? "No addresses yet"
                                : `${valid.length} address${valid.length === 1 ? "" : "es"}`}
                            {invalid.length > 0 && ` · ${invalid.length} won't send`}
                            {tooMany && ` · ${MAX_PER_BATCH} is the limit`}
                            {note.trim() && ` · ${240 - note.length} characters left in the note`}
                        </p>
                        <Button
                            variant="primary"
                            onClick={send}
                            disabled={sending || valid.length === 0 || tooMany}
                        >
                            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Send {valid.length > 0 && !tooMany ? `${valid.length} ` : ""}invitation{valid.length === 1 ? "" : "s"}
                        </Button>
                    </div>

                    {result && <Outcome result={result} onDismiss={() => setResult(null)} />}
                </div>
            </Panel>

            <Panel
                flush
                title="Invitations"
                description={
                    loading
                        ? undefined
                        : `${pending} still open · ${accepted} accepted · ${rows.length} sent in total`
                }
            >
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Address</Th>
                                <Th width="110px">Status</Th>
                                <Th width="110px">Invited by</Th>
                                <Th align="right" width="90px">Sent</Th>
                                <Th align="right" width="150px" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows cols={5} />
                            ) : rows.length === 0 ? (
                                <EmptyRow colSpan={5}>Nobody has been invited yet.</EmptyRow>
                            ) : (
                                rows.map((row) => {
                                    const expired = row.status === "pending" && inviteExpired(row);
                                    const open = row.status === "pending" && !expired;
                                    return (
                                        <Tr key={row.id} muted={!open}>
                                            <Td>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate text-ink">{row.email}</span>
                                                </div>
                                            </Td>
                                            <Td>
                                                {row.status === "accepted" ? (
                                                    <Badge tone="good">Joined {when(row.acceptedAt)}</Badge>
                                                ) : row.status === "revoked" ? (
                                                    <Badge tone="bad">Withdrawn</Badge>
                                                ) : expired ? (
                                                    <Badge tone="neutral">Expired</Badge>
                                                ) : (
                                                    <Badge tone="warn">Waiting</Badge>
                                                )}
                                            </Td>
                                            <Td>
                                                <span className="text-xs text-gray-500 truncate">
                                                    {row.invitedByName || "—"}
                                                </span>
                                            </Td>
                                            <Td align="right">
                                                <span className="text-xs text-gray-500">
                                                    {when(row.lastSentAt ?? row.createdAt)}
                                                    {(row.sentCount ?? 1) > 1 && ` ×${row.sentCount}`}
                                                </span>
                                            </Td>
                                            <Td align="right">
                                                {open || expired ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="xs"
                                                            onClick={() => act(row.id!, resendMemberInvite)}
                                                            disabled={busy === row.id}
                                                            title="Send the same link again and push the expiry back"
                                                        >
                                                            {busy === row.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <RotateCw className="w-3 h-3" />}
                                                            Resend
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="danger"
                                                            onClick={() => act(row.id!, revokeMemberInvite)}
                                                            disabled={busy === row.id}
                                                        >
                                                            Withdraw
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
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
    );
}
