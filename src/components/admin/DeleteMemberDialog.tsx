"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminUserRow, deleteMember } from "@/app/app/actions/admin";
import { Button, Input } from "./ui";

/**
 * Confirming a deletion by typing the address back.
 *
 * A `window.confirm` is the wrong control here. It is one keystroke from an
 * accidental yes, it cannot say what is about to be destroyed, and in a table
 * of members it never names *which* one. Typing the address makes the admin
 * look at the row they are actually on.
 */
export function DeleteMemberDialog({
    member,
    onClose,
    onDeleted,
}: {
    member: AdminUserRow;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [typed, setTyped] = useState("");
    const [pending, start] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus() }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onClose() };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, pending]);

    const target = (member.email ?? "").trim().toLowerCase();
    const matches = typed.trim().toLowerCase() === target && target.length > 0;

    const confirm = () => {
        start(async () => {
            const res = await deleteMember({ uid: member.id, confirmEmail: typed });
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message, {
                description: res.data
                    ? `${res.data.listings} listing${res.data.listings === 1 ? "" : "s"} and ${res.data.documents} records removed.`
                    : undefined,
                duration: 8000,
            });
            onDeleted();
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-member-title"
            onClick={() => { if (!pending) onClose() }}
        >
            <div
                className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="delete-member-title" className="text-sm font-bold text-ink">
                            Delete {member.name || "this member"}?
                        </h2>
                        <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
                            This cannot be undone. If you only want to stop them using the app,
                            suspend them instead.
                        </p>
                    </div>
                </div>

                {/* Says outright what goes and what stays. An admin should never
                    have to find out afterwards that the ID photo survived. */}
                <div className="text-[12px] text-gray-600 bg-sand/50 rounded-md p-3 space-y-1.5">
                    <p className="font-semibold text-ink">What gets deleted</p>
                    <p className="leading-snug">
                        Their sign-in, profile, {member.listingsCount} listing
                        {member.listingsCount === 1 ? "" : "s"} and every photo, their requests,
                        messages, wishlist, notifications, CRM notes and any ID they submitted.
                    </p>
                    <p className="font-semibold text-ink pt-1">What stays</p>
                    <p className="leading-snug">
                        Contact-form messages are kept but stripped of their name and address.
                        Job applications are kept — they are a separate record. The audit log
                        keeps a line saying you did this.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirm-email" className="block text-[12px] text-gray-600">
                        Type <span className="font-semibold text-ink break-all">{member.email}</span> to confirm
                    </label>
                    <Input
                        id="confirm-email"
                        ref={inputRef}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && matches && !pending) confirm() }}
                        placeholder={member.email}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={onClose} disabled={pending}>Cancel</Button>
                    <Button variant="danger" onClick={confirm} disabled={!matches || pending}>
                        {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                        {pending ? "Deleting…" : "Delete for good"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
