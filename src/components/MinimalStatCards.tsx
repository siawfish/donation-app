"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ListTodo, Gift, Clock, MessageCircle, ArrowUpRight } from "lucide-react";
import { FirebaseErrors } from "@/firebase/errors";
import { useAuth } from "@/firebase/auth/AuthContext";
import { firestore } from "@/firebase/auth/firebase";
import { collection, where, query, onSnapshot } from "firebase/firestore";
import { RequestStatus } from "@/app/types";
import { toast } from "sonner";

export function MinimalStatCards() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeListings: 0,
        myOpenRequests: 0,
        donated: 0,
        unread: 0,
    });

    useEffect(() => {
        if (!user) return;

        const ready = () => setLoading(false);
        const onError = (e: any) => {
            toast.error(FirebaseErrors[e.code] || "Couldn't load your stats");
            setLoading(false);
        };

        const unsubs = [
            // Live listings only — exclude items already donated
            onSnapshot(
                query(
                    collection(firestore, "items"),
                    where("createdBy", "==", user.uid),
                    where("donatedTo", "==", null)
                ),
                (s) => { setStats((p) => ({ ...p, activeListings: s.size })); ready(); },
                onError
            ),
            // Requests I have made that are still awaiting a decision
            onSnapshot(
                query(
                    collection(firestore, "requests"),
                    where("createdBy", "==", user.uid),
                    where("status", "==", RequestStatus.PENDING)
                ),
                (s) => { setStats((p) => ({ ...p, myOpenRequests: s.size })); ready(); },
                onError
            ),
            // Items I have successfully given away
            onSnapshot(
                query(
                    collection(firestore, "requests"),
                    where("donorId", "==", user.uid),
                    where("status", "==", RequestStatus.COMPLETED)
                ),
                (s) => { setStats((p) => ({ ...p, donated: s.size })); ready(); },
                onError
            ),
            // Unread messages addressed to me
            onSnapshot(
                query(
                    collection(firestore, "messages"),
                    where("recipientId", "==", user.uid),
                    where("read", "==", false)
                ),
                (s) => { setStats((p) => ({ ...p, unread: s.size })); ready(); },
                onError
            ),
        ];

        return () => unsubs.forEach((u) => u());
    }, [user]);

    const cards = [
        {
            title: "Active listings",
            value: stats.activeListings,
            icon: ListTodo,
            hint: "Items still available",
            href: "/app/my-items",
        },
        {
            title: "My requests",
            value: stats.myOpenRequests,
            icon: Clock,
            hint: "Awaiting a reply",
            href: "/app/pending-requests",
        },
        {
            title: "Passed on",
            value: stats.donated,
            icon: Gift,
            hint: "Given a second life",
            href: "/app/my-donations",
            feature: true,
        },
        {
            title: "Unread messages",
            value: stats.unread,
            icon: MessageCircle,
            hint: "In your inbox",
            href: "/app/messages",
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 rounded-3xl bg-sand animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {cards.map(({ title, value, icon: Icon, hint, href, feature }) => (
                <Link key={title} href={href} className="group">
                    <div
                        className={`card-hover h-full rounded-3xl p-4 md:p-5 relative ${
                            feature
                                ? "bg-lime"
                                : "bg-white border border-gray-200/70 group-hover:border-forest/30"
                        }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                                    feature ? "bg-forest text-lime" : "bg-primary-light text-primary"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <ArrowUpRight
                                className={`w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all ${
                                    feature ? "text-forest" : "text-forest"
                                }`}
                            />
                        </div>
                        <div className={`text-3xl md:text-4xl font-bold ${feature ? "text-forest" : "text-ink"}`}>
                            {value}
                        </div>
                        <p className={`text-xs font-bold mt-1 ${feature ? "text-forest" : "text-ink"}`}>{title}</p>
                        <p className={`text-[11px] mt-0.5 ${feature ? "text-forest/60" : "text-gray-400"}`}>{hint}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
