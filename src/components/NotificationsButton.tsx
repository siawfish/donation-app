"use client";

import { ActivityType } from "@/app/types"
import React, { useEffect, useState } from "react";
import { BellIcon, Loader2Icon } from "lucide-react"
import { useQueryState } from "nuqs";
import { Notifications } from "./Notifications";
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot, orderBy } from "firebase/firestore"
import { toast } from "sonner"

export default function NotificationsButton() {
    const [notifications, setNotifications] = useQueryState('notifications')
    const [activities, setActivities] = useState<ActivityType[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const { user } = useAuth()

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

    const toggleNotifications = () => {
        setNotifications(notifications ? null : "true")
    }
    return (
        <>
            <button onClick={toggleNotifications} className="flex flex-col gap-4 bg-primary-foreground p-2 rounded-md relative">
                {
                    isLoading ? (
                        <Loader2Icon className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                        <>
                            <BellIcon className="w-5 h-5 text-primary" />
                            {
                                activities.filter(activity => !activity.read).length > 0 && (
                                    <span className="bg-red-500 absolute top-[-5px] right-[-5px] text-white text-[10px] rounded-full h-5 w-5 min-w-5 max-w-5 flex items-center justify-center min-h-5">
                                        {activities.filter(activity => !activity.read).length}
                                    </span>
                                )
                            }
                        </>
                    )
                }
            </button>
            <Notifications items={activities} />
        </>
    )
}