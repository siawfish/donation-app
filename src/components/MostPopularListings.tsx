import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import EmptyState from "./EmptyState";
import ImageCard from "./ui/image-card";
import { usePathname } from "next/navigation";
import { collection, query, getDocs, where } from "firebase/firestore";
import { firestore } from "@/firebase/auth/firebase";
import { ItemType } from "@/app/types";
import { useAuth } from "@/firebase/auth/AuthContext";
import ListsLoader from "./ListsLoader";

export default function MostPopularListings() {
    const pathname = usePathname();
    const [popularItems, setPopularItems] = useState<ItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        async function fetchUserItemsWithViews() {
            if (!user) return;
            try {
                // First, fetch all items created by the user
                const itemsRef = collection(firestore, 'items');
                const userItemsQuery = query(
                    itemsRef,
                    where('createdBy', '==', user.uid)
                );
                const itemsSnapshot = await getDocs(userItemsQuery);
                const userItems = itemsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ItemType[];

                // Then, fetch view counts for each item
                const viewsRef = collection(firestore, 'views');
                const itemViewCounts = await Promise.all(
                    userItems.map(async (item) => {
                        const itemViewsQuery = query(
                            viewsRef,
                            where('itemId', '==', item.id)
                        );
                        const viewsSnapshot = await getDocs(itemViewsQuery);
                        const viewCount = viewsSnapshot.docs.length;
                        
                        return {
                            ...item,
                            viewCount
                        };
                    })
                );

                // Sort items by view count in descending order
                const sortedItems = itemViewCounts.sort((a, b) => b.viewCount - a.viewCount);
                
                // Take top 4 most viewed items
                setPopularItems(sortedItems.slice(0, 4));
            } catch (error) {
                console.error('Error fetching user items and views:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchUserItemsWithViews();
    }, [user]);

    if (loading) {
        return <ListsLoader />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Most Popular Listings</CardTitle>
                <p className="text-muted-foreground md:mb-8">
                    Your listings sorted by number of views.
                </p>
            </CardHeader>
            <CardContent>
            {
                popularItems.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {popularItems.map((item) => (
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
                        title="No listings found" 
                        description="You don't have any listings yet" 
                    />
                )
            }
            </CardContent>
        </Card>
    )
}