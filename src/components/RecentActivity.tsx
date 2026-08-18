"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ImageCard from "./ui/image-card";
import { usePathname } from "next/navigation";
import { collection, query, getDocs, where, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { firestore } from "@/firebase/auth/firebase";
import { ItemType } from "@/app/types";
import { useAuth } from "@/firebase/auth/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { ArrowRight, Clock } from "lucide-react";

export function RecentActivity() {
    const pathname = usePathname();
    const [recentItems, setRecentItems] = useState<ItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        async function fetchRecentActivity() {
            if (!user) return;
            try {
                const recentViewsQuery = query(
                    collection(firestore, "views"),
                    where("viewerId", "==", user.uid),
                    orderBy("date", "desc"),
                    limit(8)
                );
                const viewsSnapshot = await getDocs(recentViewsQuery);

                const items = await Promise.all(
                    viewsSnapshot.docs.map(async (viewDoc) => {
                        const itemDoc = await getDoc(doc(firestore, "items", viewDoc.data().itemId));
                        return itemDoc.exists() ? ({ id: itemDoc.id, ...itemDoc.data() } as ItemType) : null;
                    })
                );

                setRecentItems(items.filter((item): item is ItemType => item !== null));
            } catch (error) {
                console.error("Error fetching recent activity:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentActivity();
    }, [user]);

    if (loading) return <RecentActivitySkeleton />;

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">
                        Pick up where you left off
                    </p>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Recently viewed</h2>
                </div>
                {recentItems.length > 0 && (
                    <Link
                        href="/explore"
                        className="group inline-flex items-center gap-1.5 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3 transition-all flex-shrink-0"
                    >
                        Browse all <ArrowRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {recentItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {recentItems.map((item) => (
                        <Link key={item.id} href={`${pathname}?id=${item.id}`}>
                            <ImageCard
                                image={item.assets?.[0]?.url || ""}
                                title={item.name}
                                description={item.description}
                                distance={item.distance}
                                locationName={item.locationName}
                            />
                        </Link>
                    ))}
                </div>
            ) : (
                /* Compact prompt — a full-height empty state would swamp a new dashboard */
                <div className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-3xl px-5 py-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary-light text-primary flex-shrink-0">
                        <Clock className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">Nothing here yet</p>
                        <p className="text-xs text-gray-400">Items you view will show up here for quick access.</p>
                    </div>
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-1.5 bg-forest text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-forest-dark transition-colors flex-shrink-0"
                    >
                        Explore
                    </Link>
                </div>
            )}
        </div>
    );
}

function RecentActivitySkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-5 w-[160px]" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square w-full rounded-3xl" />
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
