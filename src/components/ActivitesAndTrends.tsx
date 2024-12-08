import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import DonorChart from "./DonorChart";
import { useAuth } from "@/firebase/auth/AuthContext";
import { ActivityType, DonorType, ItemType, UserType, UserTypes } from "@/app/types";
import UserChart from "./UserChart";
import { firestore } from "@/firebase/auth/firebase"
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, DocumentData, QueryDocumentSnapshot, where, getDoc, doc } from "firebase/firestore";
import EmptyState from "./EmptyState";
import { toast } from "sonner";
import { FirebaseErrors } from "@/firebase/errors";
import Notification from "./Notification";
import { Skeleton } from "./ui/skeleton";

function ActivitiesAndTrendsSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[65%_33%] gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[150px]" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[150px]" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ActivitesAndTrends() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityType[]>([])
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true); 
    const [itemsWithCreatorAndItem, setItemsWithCreatorAndItem] = useState<{ activity: ActivityType, creator: UserType | DonorType, item: ItemType }[]>([])

    useEffect(() => {
        if (!activities) return
        const fetchCreators = async () => {
            try {
                const itemsWithCreators = await Promise.all(activities.map(async (item) => {
                    const q = query(collection(firestore, 'users'), where('id', '==', item.createdBy))
                    const qItem = doc(collection(firestore, 'items'), item.itemId)  
                    const [docs, docsItem] = await Promise.all([getDocs(q), getDoc(qItem)])
                    return {
                        activity: item,
                        creator: docs.docs[0].data() as UserType | DonorType,
                        item: docsItem.data() as ItemType
                    }
                }))
                setItemsWithCreatorAndItem(itemsWithCreators)
            } catch (error: any) {
                toast.error(FirebaseErrors[error.code] || error.message)
            }
        }
        fetchCreators()
    }, [activities])

    useEffect(() => {
        if (!user) return
        setIsLoading(true)

        const q = query(
            collection(firestore, 'activities'), 
            where('recipientId', '==', user?.uid),
            orderBy('createdAt', 'desc')
        )
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const activitiesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }) as ActivityType)
                setActivities(activitiesData)
                setIsLoading(false)
            },
            (error) => {
                console.log(error)
                toast.error(FirebaseErrors[error.code] || error.message)
                setIsLoading(false)
            }
        )

        // Cleanup subscription on unmount
        return () => unsubscribe()
    }, [user])

    const loadMore = async () => {
        if (!lastDoc || isLoading || !hasMore) return;

        setIsLoading(true);
        const q = query(
            collection(firestore, "activities"),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(8)
        );

        try {
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setHasMore(false);
                return;
            }

            const newActivities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            } as ActivityType));

            setActivities(prev => [...prev, ...newActivities]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        } catch (error) {
            console.error("Error loading more activities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
            loadMore();
        }
    };

    if (isLoading) {
        return <ActivitiesAndTrendsSkeleton />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[65%_33%] gap-6">
            {user?.userType === UserTypes.DONOR && <DonorChart />}
            {user?.userType === UserTypes.USER && <UserChart />}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea 
                        className="h-[300px] w-full overflow-y-auto" 
                        onScroll={handleScroll}
                    >
                        {
                            itemsWithCreatorAndItem.length > 0 ? 
                            itemsWithCreatorAndItem?.map((item) => (
                                <Notification key={item.activity.id} notification={item} />
                            )) : 
                            <EmptyState 
                                title="No activities" 
                                description="You have no activities" 
                                containerClassName="min-h-[300px]"
                                imgWidth={100}
                                imgHeight={100}
                            />
                        }
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}