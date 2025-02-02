'use client'

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useQueryState } from 'nuqs'
import { BellIcon } from "lucide-react"
import Notification from "./Notification"
import { ActivityType, UserType } from "@/app/types"
import { ItemType } from "@/app/types"
import { useState, useEffect } from "react"
import { FirebaseErrors } from "@/firebase/errors"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, getDocs, doc, getDoc } from "firebase/firestore"
import { toast } from "sonner"
import { ScrollArea } from "./ui/scroll-area"
import EmptyState from "./EmptyState"

interface NotificationsProps {
    items: ActivityType[]
}

export function Notifications({ items }: NotificationsProps) {
    const [notifications, setNotifications] = useQueryState('notifications')
    const [itemsWithCreatorAndItem, setItemsWithCreatorAndItem] = useState<{ activity: ActivityType, creator: UserType | null, item: ItemType | null }[]>([])

    useEffect(() => {
        if (!items) return
        const fetchCreators = async () => {
            try {
                const itemsWithCreators = await Promise.allSettled(items.map(async (item) => {
                    const q = query(collection(firestore, 'users'), where('id', '==', item.createdBy))
                    const userDocs = await getDocs(q)
                    
                    let itemData = null
                    if (item.itemId) {
                        const itemRef = doc(collection(firestore, 'items'), item.itemId)
                        const itemDoc = await getDoc(itemRef)
                        itemData = itemDoc.exists() ? itemDoc.data() as ItemType : null
                    }

                    const userData = userDocs.docs[0]?.data() as UserType

                    return {
                        activity: item,
                        creator: userData || null,
                        item: itemData
                    }
                }))
                const validItems = itemsWithCreators
                    .filter((result): result is PromiseFulfilledResult<{
                        activity: ActivityType;
                        creator: UserType;
                        item: ItemType | null;
                    }> => result.status === 'fulfilled' && result.value.creator !== null)
                    .map(result => result.value)

                setItemsWithCreatorAndItem(validItems)
            } catch (error: any) {
                toast.error(FirebaseErrors[error.code] || error.message)
            }
        }
        fetchCreators()
    }, [items])

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setNotifications(null)
        }
    }
    
    return (
        <Sheet open={!!notifications} onOpenChange={onOpenChange}>
            <SheetContent className="min-w-[100vw] lg:min-w-[600px] px-0">
                <ScrollArea className="h-full">
                    <div className="mt-6 px-6 space-y-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex gap-2">
                                <span className="bg-primary-foreground text-primary rounded-md p-2 h-fit mt-1">
                                    <BellIcon className="w-4 h-4" />
                                </span>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-semibold mb-0 tracking-tight leading-tight">Notifications</h2>
                                    <p className="text-muted-foreground mb-0 tracking-tight leading-tight">
                                        Here are your notifications.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            {
                                itemsWithCreatorAndItem.length > 0 ? 
                                itemsWithCreatorAndItem?.map((item) => (
                                    <Notification key={item.activity.id} notification={item} />
                                )) : 
                                <EmptyState title="No notifications" description="You have no notifications" />
                            }
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
