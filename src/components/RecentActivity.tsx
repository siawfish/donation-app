"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import EmptyState from "./EmptyState";
import ImageCard from "./ui/image-card";
import { usePathname } from "next/navigation";
import { collection, query, getDocs, where, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { firestore } from "@/firebase/auth/firebase";
import { ItemType } from "@/app/types";
import { useAuth } from "@/firebase/auth/AuthContext";
import { Skeleton } from "./ui/skeleton";

export function RecentActivity() {
    const pathname = usePathname();
    const [recentItems, setRecentItems] = useState<ItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        async function fetchRecentActivity() {
            if (!user) return;
            try {
                // Fetch user's recent views (limit to 6 for minimalism)
                const viewsRef = collection(firestore, 'views');
                const recentViewsQuery = query(
                    viewsRef,
                    where('viewerId', '==', user.uid),
                    orderBy('date', 'desc'),
                    limit(6)
                );
                const viewsSnapshot = await getDocs(recentViewsQuery);
                
                // Get the items for these views
                const itemsRef = collection(firestore, 'items');
                const items = await Promise.all(
                    viewsSnapshot.docs.map(async (viewDoc) => {
                        const itemId = viewDoc.data().itemId;
                        const itemDoc = await getDoc(doc(itemsRef, itemId));
                        if (itemDoc.exists()) {
                            return {
                                id: itemDoc.id,
                                ...itemDoc.data()
                            } as ItemType;
                        }
                        return null;
                    })
                );

                // Filter out any null values
                setRecentItems(items.filter((item): item is ItemType => item !== null));
            } catch (error) {
                console.error('Error fetching recent activity:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentActivity();
    }, [user]);

    if (loading) {
        return <RecentActivitySkeleton />;
    }

    return (
        <Card className="shadow-none border-none p-0 m-0 space-y-2">
            <CardHeader className="p-0 m-0">
                <CardTitle>Recently Viewed</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                        Items you&apos;ve looked at recently
                    </p>
            </CardHeader>
            <CardContent className="p-0 m-0">
                {recentItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {recentItems.map((item) => (
                            <Link key={item.id} href={`${pathname}?id=${item.id}`}>
                                <ImageCard
                                    image={item.assets[0]?.url || '/placeholder.svg'}
                                    title={item.name}
                                    description={item.description}
                                    containerClassName="bg-white"
                                />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        title="No recent activity" 
                        description="Start exploring items to see your recent views here"
                        containerClassName="py-8"
                    />
                )}
            </CardContent>
        </Card>
    );
}

function RecentActivitySkeleton() {
    return (
        <Card className="shadow-none border-none p-0 m-0 space-y-2">
            <CardHeader className="p-0 m-0">
                <Skeleton className="h-6 w-[140px] mb-2" />
                <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent className="p-0 m-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 