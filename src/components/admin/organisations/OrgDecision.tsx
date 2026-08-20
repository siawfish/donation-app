"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, BadgeCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { saveOrgNotes, setOrgStatus, setOrgVerified } from "@/app/app/actions/organisations";
import { ORG_STATUS_LABELS, OrgStatus } from "@/lib/organisations";
import { Button, Panel, Select, Textarea } from "../ui";

/**
 * The decision panel.
 *
 * Approving makes a storefront public under Givny's name, so the actions are
 * deliberate rather than a dropdown you can brush past — and declining demands
 * a reason, because somebody applied and is waiting for an answer.
 */
export function OrgDecision({
    id,
    status,
    verified,
    notes: initialNotes,
    canManage,
}: {
    id: string;
    status: OrgStatus;
    verified: boolean;
    notes: string;
    canManage: boolean;
}) {
    const [pending, startTransition] = useTransition();
    const [busy, setBusy] = useState<string | null>(null);
    const [notes, setNotes] = useState(initialNotes);
    const [next, setNext] = useState<OrgStatus>(status);

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
        });
    };

    const decline = () => {
        const reason = window.prompt("Why are we declining? They'll be told.");
        if (reason === null) return;
        if (!reason.trim()) { toast.error("A reason is required."); return; }
        run("decline", () => setOrgStatus(id, "rejected", reason));
    };

    if (!canManage) {
        return (
            <Panel title="Decision">
                <p className="text-xs text-gray-500">
                    You can read this record but not change it.
                </p>
            </Panel>
        );
    }

    const awaitingDecision = status === "applied" || status === "reviewing";

    return (
        <div className="space-y-4">
            <Panel title="Decision">
                {awaitingDecision ? (
                    <>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">
                            Approving publishes their storefront immediately. Check the organisation is
                            real first — the registration number and website are on the left.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="primary" className="flex-1 justify-center" disabled={busy !== null}
                                onClick={() => run("approve", () => setOrgStatus(id, "active"))}>
                                {busy === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve
                            </Button>
                            <Button variant="danger" className="flex-1 justify-center" disabled={busy !== null} onClick={decline}>
                                <X className="w-3.5 h-3.5" /> Decline
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                            Status
                        </label>
                        <Select value={next} onChange={(e) => setNext(e.target.value as OrgStatus)} className="w-full mt-1">
                            {(Object.keys(ORG_STATUS_LABELS) as OrgStatus[]).map((s) => (
                                <option key={s} value={s}>{ORG_STATUS_LABELS[s]}</option>
                            ))}
                        </Select>
                        <Button
                            className="w-full justify-center mt-2"
                            disabled={busy !== null || next === status}
                            onClick={() => {
                                if (next === "rejected") { decline(); return; }
                                run("status", () => setOrgStatus(id, next));
                            }}
                        >
                            {busy === "status" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Update status
                        </Button>
                    </>
                )}

                {status === "active" && (
                    <Button
                        variant={verified ? "default" : "primary"}
                        className="w-full justify-center mt-2"
                        disabled={busy !== null}
                        onClick={() => run("verify", () => setOrgVerified(id, !verified))}
                    >
                        {busy === "verify" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                        {verified ? "Remove verification" : "Mark verified"}
                    </Button>
                )}
            </Panel>

            <Panel title="Internal notes" description="Never shown to the organisation.">
                <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="What we checked, who we spoke to, anything the next admin should know." />
                <Button className="mt-2 w-full justify-center" disabled={busy === "notes"}
                    onClick={() => run("notes", () => saveOrgNotes(id, notes))}>
                    {busy === "notes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save notes
                </Button>
            </Panel>
        </div>
    );
}
