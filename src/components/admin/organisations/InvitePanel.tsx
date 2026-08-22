"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import {
    createOrgInvite, listOrgInvites, revokeOrgInvite,
} from "@/app/app/actions/organisations";
import { CLAIM_LABELS, type ClaimStatus, type OrgInvite, type OrgRole } from "@/lib/organisations";
import { Badge, Button, Input, Panel } from "../ui";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";

const inviteUrl = (token: string) => `${SITE}/claim/${token}`;

const when = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const TONE: Record<OrgInvite["status"], "neutral" | "good" | "warn" | "bad"> = {
    pending: "warn",
    accepted: "good",
    revoked: "neutral",
    expired: "bad",
};

/**
 * Invitations for a prepared page.
 *
 * The link is shown rather than emailed. An admin can then send it through
 * whatever the contact actually reads — which in Ghana is far more often
 * WhatsApp than email — and there is no silent outbound mail from the platform.
 */
export function InvitePanel({
    orgId,
    orgName,
    claim,
    contactEmail,
    contactName,
}: {
    orgId: string;
    orgName: string;
    claim?: ClaimStatus;
    contactEmail?: string;
    contactName?: string;
}) {
    const [invites, setInvites] = useState<OrgInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState(contactEmail ?? "");
    const [name, setName] = useState(contactName ?? "");
    const [role, setRole] = useState<OrgRole>("owner");
    const [copied, setCopied] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const load = useCallback(async () => {
        const res = await listOrgInvites(orgId);
        setInvites(res.data ?? []);
        setLoading(false);
    }, [orgId]);

    useEffect(() => { load() }, [load]);

    const invite = () => {
        setBusy("new");
        startTransition(async () => {
            const res = await createOrgInvite(orgId, { email, name, role });
            setBusy(null);
            if (!res.success || !res.data) { toast.error(res.message); return; }
            toast.success("Invitation ready — copy the link and send it");
            copy(res.data.token);
            load();
        });
    };

    const copy = async (token: string) => {
        try {
            await navigator.clipboard.writeText(inviteUrl(token));
            setCopied(token);
            setTimeout(() => setCopied(null), 2500);
        } catch {
            toast.error("Couldn't copy — select the link and copy it by hand.");
        }
    };

    const revoke = (id: string) => {
        setBusy(id);
        startTransition(async () => {
            const res = await revokeOrgInvite(id);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const claimed = claim === "claimed";

    return (
        <Panel
            title="Ownership"
            description={
                claimed
                    ? `${orgName} has claimed this page and manages it themselves.`
                    : "Send someone at the organisation a link to take this page over."
            }
            actions={<Badge tone={claimed ? "good" : "warn"}>{CLAIM_LABELS[claim ?? "unclaimed"]}</Badge>}
        >
            {!claimed && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                    <label className="block">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Email</span>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full mt-1" />
                    </label>
                    <label className="block">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Name</span>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1" />
                    </label>
                    <label className="block">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Role</span>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as OrgRole)}
                            className="mt-1 bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                        >
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="lister">Lister</option>
                        </select>
                    </label>
                    <Button variant="primary" onClick={invite} disabled={busy === "new" || !email.trim()}>
                        {busy === "new" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Create link
                    </Button>
                </div>
            )}

            <div className="mt-4">
                {loading ? (
                    <p className="text-xs text-gray-500 py-3">Loading…</p>
                ) : invites.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3">No invitations yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {invites.map((inv) => (
                            <li key={inv.id} className="flex flex-wrap items-center gap-2 py-2.5">
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-ink truncate">
                                        {inv.email}
                                        <span className="font-normal text-gray-400"> · {inv.role}</span>
                                    </span>
                                    <span className="block text-[11px] text-gray-400">
                                        Created {when(inv.createdAt)}
                                        {inv.status === "pending" && ` · expires ${when(inv.expiresAt)}`}
                                        {inv.status === "accepted" && inv.acceptedAt && ` · accepted ${when(inv.acceptedAt)}`}
                                    </span>
                                </span>

                                <Badge tone={TONE[inv.status]}>{inv.status}</Badge>

                                {inv.status === "pending" && (
                                    <>
                                        <Button onClick={() => copy(inv.token)}>
                                            {copied === inv.token
                                                ? <Check className="w-3.5 h-3.5 text-primary" />
                                                : <Copy className="w-3.5 h-3.5" />}
                                            {copied === inv.token ? "Copied" : "Copy link"}
                                        </Button>
                                        <Button variant="danger" onClick={() => revoke(inv.id!)} disabled={busy === inv.id}>
                                            {busy === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                            Withdraw
                                        </Button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {!claimed && (
                <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                    Anyone with the link can take ownership, so send it to the person you mean.
                    It lasts 30 days and can only be used once. Until it is accepted, the public
                    page says Givny prepared it.
                </p>
            )}
        </Panel>
    );
}
