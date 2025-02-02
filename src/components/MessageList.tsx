"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQueryState } from 'nuqs'
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot, doc, getDoc, orderBy, getDocs } from "firebase/firestore"
import { toast } from "sonner"
import { RequestType, RequestStatus, ItemType, UserType } from "@/app/types";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import StatusBadge from "./StatusBadge";

export default function MessageList() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useQueryState('search')
  const [rid, setRid] = useQueryState("rid")
  const [requestsWithRecipientAndItemAndLastMessageAndUnreadCount, setRequestsWithRecipientAndItemAndLastMessageAndUnreadCount] = useState<{
    request: RequestType,
    recipient: UserType,
    item: ItemType,
    lastMessage: string,
    unreadCount: number
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    const q = query(collection(firestore, 'requests'), where('createdBy', '==', user?.uid), where('status', 'in', [RequestStatus.COMPLETED, RequestStatus.CANCELLED, RequestStatus.ACCEPTED]))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RequestType)
        const requestsWithRecipientAndItem = await Promise.all(requestsData.map(async (request) => {
          const recipientId = request.createdBy
          const itemId = request.itemId
          const lastMessageQuery = query(collection(firestore, 'messages'), where('requestId', '==', request.id), orderBy('createdAt', 'desc'))
          const unreadCountQuery = query(collection(firestore, 'messages'), where('requestId', '==', request.id), where('read', '==', false))
          const [recipient, item, lastMessage, unreadCount] = await Promise.all([
            getDoc(doc(collection(firestore, 'users'), recipientId)),
            getDoc(doc(collection(firestore, 'items'), itemId)),
            getDocs(lastMessageQuery),
            getDocs(unreadCountQuery)
          ])
          return { 
            request, 
            recipient: {
              ...recipient.data(),
              id: recipient.id
            } as UserType, 
            item: {
              ...item.data(),
              id: item.id
            } as ItemType,
            lastMessage: lastMessage.docs[0]?.data()?.content || 'Start a conversation',
            unreadCount: unreadCount.docs.length || 0
          }
        }))
        setRequestsWithRecipientAndItemAndLastMessageAndUnreadCount(requestsWithRecipientAndItem)
      } catch (error: any) {
        toast.error("Failed to fetch messages",{
          description: FirebaseErrors[error.code] || error.message
        })
      }
    })
    setIsLoading(false)
    return ()=>unsubscribe()
  }, [user])

  const filteredMessages = useMemo(() => {
    return requestsWithRecipientAndItemAndLastMessageAndUnreadCount.filter((request) => {
      return request.recipient.name.toLowerCase().includes(searchTerm?.toLowerCase() || '')
    })
  }, [requestsWithRecipientAndItemAndLastMessageAndUnreadCount, searchTerm])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg sm:text-xl font-semibold">Messages</h2>
      </div>
      <div className="p-4 border-b">
        <Input
          type="text"
          placeholder="Search messages..."
          value={searchTerm || ''}
          onChange={(e) => {
            if(e.target.value === '') {
              setSearchTerm(null)
              return
            }
            setSearchTerm(e.target.value)
          }}
          className="w-full"
        />
      </div>
      <ScrollArea className="flex-grow">
        {filteredMessages.map((message) => (
          <div
            key={message.request.id}
            className={`flex flex-col cursor-pointer border-b hover:bg-primary-foreground ${rid === message?.request?.id ? 'bg-primary-foreground' : ''}`}
            onClick={() => setRid(message.request.id ?? null)}
          >
            <div className="flex flex-row items-center p-4 pb-1">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mr-2">
                <AvatarImage src={message.recipient?.profileUrl} alt={message.recipient.name} />
                <AvatarFallback>{message.recipient.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <h3 className="font-semibold text-sm sm:text-base">{message.recipient.name}</h3>
                  <div className="mt-1 sm:mt-0">
                    <StatusBadge requestStatus={message.request.status as RequestStatus} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[80%] sm:max-w-[90%]">{message.lastMessage}</p>
                  {message.unreadCount > 0 && (
                    <div className="flex items-center justify-end">
                      <span className="bg-primary text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-[16px] sm:min-w-[20px] max-w-[16px] sm:max-w-[20px] max-h-[16px] sm:max-h-[20px] flex items-center justify-center text-center">
                        {message.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 border-t px-4 py-1">
              <div className="bg-accent rounded-sm flex items-center justify-center min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px]">
                <Image src={message.item.assets?.[0]?.url} alt="Call" width={24} height={24} className="rounded-sm"/>
              </div>
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{message.item.name}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground line-clamp-1">{message.item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}
