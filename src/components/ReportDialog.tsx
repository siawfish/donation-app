"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Ban, CheckCircle2, HelpCircle, Loader2, MessageCircleWarning, ShieldAlert, X } from "lucide-react"
import { toast } from "sonner"
import { submitContactMessage } from "@/app/app/actions/contact"
import { Button } from "./ui/button"

type ReportReason = "harassment" | "scam" | "unsafe" | "spam" | "other"

const REASONS: { id: ReportReason; label: string; icon: React.ReactNode }[] = [
    { id: "harassment", label: "Rude or inappropriate messages", icon: <MessageCircleWarning className="w-4 h-4" /> },
    { id: "scam", label: "Asking for money, or a scam", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "unsafe", label: "Unsafe or concerning meetup", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "spam", label: "Spam or a fake listing", icon: <Ban className="w-4 h-4" /> },
    { id: "other", label: "Something else", icon: <HelpCircle className="w-4 h-4" /> },
]

const REASON_LABEL: Record<ReportReason, string> = Object.fromEntries(
    REASONS.map((r) => [r.id, r.label])
) as Record<ReportReason, string>

interface ReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Who this report is about, and what it's attached to — folded into the
     * message body so the admin has full context without a schema change. */
    context: {
        recipientName?: string
        itemName?: string
        requestId?: string | null
        itemId?: string
    }
    reporterName?: string
    reporterEmail?: string
}

/**
 * A report a person can actually make from inside a conversation, rather than
 * being pointed at a generic contact form and having to explain from scratch
 * who and what it's about. Goes through the same contact pipeline — tagged
 * `safety` so it stands out in the admin inbox — since a parallel moderation
 * system would be a second inbox nobody remembers to check.
 */
export function ReportDialog({ open, onOpenChange, context, reporterName, reporterEmail }: ReportDialogProps) {
    const [reason, setReason] = useState<ReportReason | null>(null)
    const [details, setDetails] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(false)

    // A fresh dialog every time it opens — a report about one person should
    // never carry a leftover draft into a report about someone else.
    useEffect(() => {
        if (open) {
            setReason(null)
            setDetails("")
            setSent(false)
        }
    }, [open])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onOpenChange(false) }
        if (open) window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, submitting, onOpenChange])

    const detailsRef = useRef<HTMLTextAreaElement>(null)

    if (!open) return null

    const submit = async () => {
        if (!reason || submitting) return
        setSubmitting(true)
        try {
            const who = context.recipientName ? ` with ${context.recipientName}` : ""
            const about = context.itemName ? ` about "${context.itemName}"` : ""
            const message = [
                `Reason: ${REASON_LABEL[reason]}`,
                "",
                details.trim() || "No additional details provided.",
                "",
                `— Reported from a conversation${about}${who}${context.requestId ? ` (request ${context.requestId})` : ""}.`,
            ].join("\n")

            const res = await submitContactMessage({
                name: reporterName?.trim() || "Givny member",
                email: reporterEmail?.trim() || "",
                topic: "safety",
                message,
                fromPath: typeof window !== "undefined" ? window.location.pathname : undefined,
            })
            if (!res.success) { toast.error(res.message); return }
            setSent(true)
        } catch {
            toast.error("Couldn't send that report — try again in a moment.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            onClick={() => { if (!submitting) onOpenChange(false) }}
        >
            <div
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {sent ? (
                    <div className="p-6 flex flex-col items-center text-center gap-3">
                        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-light text-forest">
                            <CheckCircle2 className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-ink">Report sent</h2>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                                Thanks for flagging this — our team will take a look and follow up if we need anything else.
                            </p>
                        </div>
                        <Button onClick={() => onOpenChange(false)} className="w-full justify-center rounded-full mt-1">
                            Done
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-3 px-5 pt-5">
                            <div className="flex items-start gap-3 min-w-0">
                                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-600 flex-shrink-0">
                                    <ShieldAlert className="w-[18px] h-[18px]" />
                                </span>
                                <div className="min-w-0">
                                    <h2 id="report-dialog-title" className="text-base font-bold text-ink">Report this conversation</h2>
                                    {context.recipientName && (
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                            About your chat with {context.recipientName}
                                            {context.itemName && <> · {context.itemName}</>}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                disabled={submitting}
                                className="text-gray-400 hover:text-ink flex-shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.06em] mb-2">
                                    What&apos;s going on?
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {REASONS.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => { setReason(r.id); setTimeout(() => detailsRef.current?.focus(), 0) }}
                                            className={`flex items-center gap-2.5 text-left text-sm font-medium px-3.5 py-2.5 rounded-2xl border transition-colors ${
                                                reason === r.id
                                                    ? "border-forest bg-primary-light text-forest"
                                                    : "border-gray-200 text-ink hover:border-forest/40 hover:bg-gray-50"
                                            }`}
                                        >
                                            {r.icon}
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.06em]">
                                    Anything else we should know? <span className="normal-case font-normal text-gray-400">(optional)</span>
                                </span>
                                <textarea
                                    ref={detailsRef}
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    rows={3}
                                    maxLength={2000}
                                    placeholder="Whatever's useful for us to know…"
                                    className="w-full mt-1.5 rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder-gray-400 outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors resize-none"
                                />
                            </label>

                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                This goes straight to our safety team, not to {context.recipientName || "the other person"}.
                                If you&apos;re in immediate danger, contact local authorities first.
                            </p>

                            <Button
                                onClick={submit}
                                disabled={!reason || submitting}
                                className="w-full justify-center rounded-full bg-forest hover:bg-forest-dark text-white"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                Send report
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
