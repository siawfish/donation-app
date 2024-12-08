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
import ListsLoader from "./ListsLoader";

export default function RecentViews() {
    const pathname = usePathname();
    const [recentViews, setRecentViews] = useState<ItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        async function fetchRecentViews() {
            if (!user) return;
            try {
                // First, fetch the user's recent views
                const viewsRef = collection(firestore, 'views');
                const recentViewsQuery = query(
                    viewsRef,
                    where('viewerId', '==', user.uid),
                    orderBy('date', 'desc'),
                    limit(4)
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

                // Filter out any null values and set the state
                setRecentViews(items.filter((item): item is ItemType => item !== null));
            } catch (error) {
                console.error('Error fetching recent views:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentViews();
    }, [user]);

    if (loading) {
        return (
            <ListsLoader />
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Recent Views</CardTitle>
                <p className="text-muted-foreground md:mb-8">
                    Listings that you have viewed recently.
                </p>
            </CardHeader>
            <CardContent>
            {
                recentViews.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {recentViews.map((item) => (
                                <Link key={item.id} href={`${pathname}?id=${item.id}`}>
                                    <ImageCard
                                        image={item.assets[0].url}
                                        title={item.name}
                                        description={item.description}
                                        containerClassName="bg-white"
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <EmptyState 
                        title="No views yet" 
                        description="You haven't viewed any listings yet" 
                    />
                )
            }
            </CardContent>
        </Card>
    );
}