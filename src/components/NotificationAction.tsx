"use client";

import { ActivityAction, RequestStatus, RequestType, UserType } from "@/app/types"
import { Button } from "./ui/button"
import React, { useCallback, useEffect, useState } from "react"
import { FirebaseErrors } from "@/firebase/errors"
import { firestore } from "@/firebase/auth/firebase"
import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "@/firebase/auth/AuthContext";

interface NotificationActionProps {
    requestId: string
    creator: UserType | null
}

export default function NotificationAction({ requestId, creator }: NotificationActionProps) {
    const [request, setRequest] = useState<RequestType | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { user } = useAuth()


    const fetchRequest = useCallback(async () => {
        if (!user) return
        try {
            const q = doc(collection(firestore, 'requests'), requestId)
            const docSnap = await getDoc(q)
            setRequest({
                id: docSnap.id,
                ...docSnap.data()
            } as RequestType)
        } catch (error: any) {
            toast.error(FirebaseErrors[error.code] || error.message)
        }
    }, [requestId, user])

    useEffect(() => {
        fetchRequest()
    }, [fetchRequest])

    const handleUpdateRequest = async (status: RequestStatus) => {
        if (!user) return
        setIsLoading(true)
        try {
            const updatePromise = updateDoc(doc(collection(firestore, 'requests'), requestId), {
                status
            })
            const addActivityPromise = addDoc(collection(firestore, 'activities'), {
                action: status === RequestStatus.ACCEPTED ? ActivityAction.REQUEST_ACCEPTED : ActivityAction.REQUEST_REJECTED,
                itemId: request?.itemId,
                requestId: requestId,
                recipientId: request?.createdBy,
                createdBy: user?.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            await Promise.all([updatePromise, addActivityPromise])
            fetchRequest()
            toast.success(`Request ${status} successfully`, {
                position: "bottom-left",
                description: `${creator?.name} will be notified of your decision`
            })
        } catch (error: any) {
            toast.error("Something went wrong", {
                position: "bottom-left",
                description: FirebaseErrors[error.code] || error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (request?.status !== RequestStatus.PENDING) return null
    return (
        <div className="flex flex-row justify-end gap-2">
            <Button 
                onClick={() => handleUpdateRequest(RequestStatus.REJECTED)} 
                className="text-xs h-fit py-2 rounded-md" 
                variant="outline"
                disabled={isLoading}
            >
                Reject
            </Button>
            <Button 
                onClick={() => handleUpdateRequest(RequestStatus.ACCEPTED)} 
                className="text-xs h-fit py-2 rounded-md" 
                variant="default"
                disabled={isLoading}
            >
                Accept
            </Button>
        </div>
    )
}