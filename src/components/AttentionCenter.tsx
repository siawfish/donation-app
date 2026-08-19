"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { firestore } from "@/firebase/auth/firebase";
import { useAuth } from "@/firebase/auth/AuthContext"
import { useClientAuthReady } from "@/firebase/auth/useClientAuth";
import { ActivityAction, ItemType, RequestStatus, RequestType, UserType } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { toast } from "sonner";
import { Check, X, MessageCircle, Sparkles, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Enriched = {
    request: RequestType;
    item: ItemType | null;
    counterpart: UserType | null;
    /** "incoming" = someone wants my item · "outgoing" = I asked for their item */
    direction: "incoming" | "outgoing";
};

/** Hydrate a request with its item + the other person involved. */
async function enrich(
    request: RequestType,
    direction: "incoming" | "outgoing"
): Promise<Enriched> {
    const counterpartId = direction === "incoming" ? request.createdBy : request.donorId;
    try {
        const [itemSnap, userSnap] = await Promise.all([
            getDoc(doc(firestore, "items", request.itemId)),
            counterpartId ? getDoc(doc(firestore, "users", counterpartId)) : Promise.resolve(null),
        ]);
        return {
            request,
            item: itemSnap.exists() ? ({ ...itemSnap.data(), id: itemSnap.id } as ItemType) : null,
            counterpart: userSnap?.exists() ? ({ ...userSnap.data(), id: userSnap.id } as UserType) : null,
            direction,
        };
    } catch {
        return { request, item: null, counterpart: null, direction };
    }
}

function Thumb({ item }: { item: ItemType | null }) {
    const url = item?.assets?.[0]?.url;
    return (
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-sand flex-shrink-0">
            {url && <Image src={url} alt={item?.name ?? "item"} fill sizes="48px" className="object-cover" />}
        </div>
    );
}

export function AttentionCenter() {
    const { user } = useAuth();
    const clientReady = useClientAuthReady();
    const [incomingPending, setIncomingPending] = useState<Enriched[]>([]);
    const [readyToArrange, setReadyToArrange] = useState<Enriched[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !clientReady) return;

        const onError = (e: any) =>
            toast.error("Couldn't load your requests", { description: FirebaseErrors[e.code] || e.message });

        // Requests other people made on MY items, awaiting my decision
        const unsubIncoming = onSnapshot(
            query(
                collection(firestore, "requests"),
                where("donorId", "==", user.uid),
                where("status", "==", RequestStatus.PENDING)
            ),
            async (snap) => {
                const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RequestType));
                setIncomingPending(await Promise.all(rows.map((r) => enrich(r, "incoming"))));
                setLoading(false);
            },
            (e) => { onError(e); setLoading(false); }
        );

        // Accepted — I'm the donor, need to hand the item over
        const unsubAcceptedAsDonor = onSnapshot(
            query(
                collection(firestore, "requests"),
                where("donorId", "==", user.uid),
                where("status", "==", RequestStatus.ACCEPTED)
            ),
            async (snap) => {
                const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RequestType));
                const enriched = await Promise.all(rows.map((r) => enrich(r, "incoming")));
                setReadyToArrange((prev) => [
                    ...prev.filter((p) => p.direction !== "incoming"),
                    ...enriched,
                ]);
            },
            onError
        );

        // Accepted — I'm the requester, need to collect
        const unsubAcceptedAsRequester = onSnapshot(
            query(
                collection(firestore, "requests"),
                where("createdBy", "==", user.uid),
                where("status", "==", RequestStatus.ACCEPTED)
            ),
            async (snap) => {
                const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RequestType));
                const enriched = await Promise.all(rows.map((r) => enrich(r, "outgoing")));
                setReadyToArrange((prev) => [
                    ...prev.filter((p) => p.direction !== "outgoing"),
                    ...enriched,
                ]);
            },
            onError
        );

        return () => { unsubIncoming(); unsubAcceptedAsDonor(); unsubAcceptedAsRequester(); };
    }, [user, clientReady]);

    const decide = async (row: Enriched, status: RequestStatus) => {
        if (!user || !row.request.id) return;
        setBusyId(row.request.id);
        try {
            await Promise.all([
                updateDoc(doc(firestore, "requests", row.request.id), {
                    status,
                    updatedAt: new Date().toISOString(),
                }),
                addDoc(collection(firestore, "activities"), {
                    action:
                        status === RequestStatus.ACCEPTED
                            ? ActivityAction.REQUEST_ACCEPTED
                            : ActivityAction.REQUEST_REJECTED,
                    itemId: row.request.itemId,
                    requestId: row.request.id,
                    recipientId: row.request.createdBy,
                    createdBy: user.uid,
                    read: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }),
            ]);
            toast.success(
                status === RequestStatus.ACCEPTED ? "Request accepted" : "Request declined",
                {
                    description:
                        status === RequestStatus.ACCEPTED
                            ? `You can now message ${row.counterpart?.name ?? "them"} to arrange pickup.`
                            : `${row.counterpart?.name ?? "They"} will be notified.`,
                }
            );
        } catch (e: any) {
            toast.error("Something went wrong", { description: FirebaseErrors[e.code] || e.message });
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return <div className="h-40 rounded-3xl bg-sand animate-pulse" />;
    }

    const total = incomingPending.length + readyToArrange.length;

    // All clear — keep it light, don't take up the whole screen
    if (total === 0) {
        return (
            <div className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-3xl px-5 py-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-lime text-forest flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">You&apos;re all caught up</p>
                    <p className="text-xs text-gray-400">
                        No requests waiting on you. Why not{" "}
                        <Link href="/explore" className="text-primary font-semibold hover:underline">
                            browse what&apos;s nearby
                        </Link>
                        ?
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="forest-panel rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 md:px-6 pt-5 pb-4">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-lime/80 mb-1">
                        Needs your attention
                    </p>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        {incomingPending.length > 0
                            ? `${incomingPending.length} ${incomingPending.length === 1 ? "person is" : "people are"} waiting on you`
                            : "Ready to arrange"}
                    </h2>
                </div>
                <span className="flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full bg-lime text-forest text-sm font-extrabold flex-shrink-0">
                    {total}
                </span>
            </div>

            <div className="px-3 md:px-4 pb-4 space-y-2">
                {/* Pending decisions — accept / decline inline */}
                {incomingPending.map((row) => (
                    <div
                        key={row.request.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/8 border border-white/10 rounded-2xl p-3"
                    >
                        <Thumb item={row.item} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-snug">
                                <span className="font-bold">{row.counterpart?.name ?? "Someone"}</span>
                                {" wants your "}
                                <span className="font-bold">{row.item?.name ?? "item"}</span>
                            </p>
                            {row.request.createdAt && (
                                <p className="text-[11px] text-white/40 mt-0.5">
                                    asked {formatDistanceToNow(new Date(row.request.createdAt), { addSuffix: true })}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => decide(row, RequestStatus.REJECTED)}
                                disabled={busyId === row.request.id}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-white/20 text-white/80 text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" /> Decline
                            </button>
                            <button
                                onClick={() => decide(row, RequestStatus.ACCEPTED)}
                                disabled={busyId === row.request.id}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-lime text-forest text-xs font-bold hover:brightness-95 transition-all disabled:opacity-50"
                            >
                                <Check className="w-3.5 h-3.5" /> Accept
                            </button>
                        </div>
                    </div>
                ))}

                {/* Accepted — arrange handover / pickup */}
                {readyToArrange.map((row) => (
                    <div
                        key={row.request.id}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
                    >
                        <Thumb item={row.item} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-snug truncate">
                                <span className="font-bold">{row.item?.name ?? "Item"}</span>
                                <span className="text-white/50">
                                    {row.direction === "incoming"
                                        ? ` — hand over to ${row.counterpart?.name ?? "requester"}`
                                        : ` — collect from ${row.counterpart?.name ?? "them"}`}
                                </span>
                            </p>
                            <p className="text-[11px] text-lime/70 mt-0.5 font-medium">Accepted · arrange a pickup</p>
                        </div>
                        <Link
                            href={`/app/messages?rid=${row.request.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-lime/40 text-lime text-xs font-bold hover:bg-lime hover:text-forest transition-colors flex-shrink-0"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Message</span>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Footer link */}
            <Link
                href="/app/pending-requests"
                className="group flex items-center justify-between gap-2 px-5 md:px-6 py-3.5 border-t border-white/10 text-white/60 hover:text-lime text-xs font-semibold transition-colors"
            >
                See all requests
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
