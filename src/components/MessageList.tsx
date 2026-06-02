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
import EmptyState from "./EmptyState";

type ConversationEntry = {
  request: RequestType;
  otherPerson: UserType;
  item: ItemType;
  lastMessage: string;
  unreadCount: number;
};

/** Given a request + current uid, return the UID of the other participant */
function otherPersonId(request: RequestType, myUid: string): string {
  return request.createdBy === myUid ? request.donorId : (request.createdBy as string);
}

export default function MessageList() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useQueryState('search')
  const [rid, setRid] = useQueryState("rid")
  const [conversations, setConversations] = useState<ConversationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)

    const statuses = [RequestStatus.COMPLETED, RequestStatus.CANCELLED, RequestStatus.ACCEPTED]

    // Query 1: requests the current user MADE (as requester)
    const asRequesterQ = query(
      collection(firestore, 'requests'),
      where('createdBy', '==', user.uid),
      where('status', 'in', statuses)
    )

    // Query 2: requests made TO the current user's items (as donor)
    const asDonorQ = query(
      collection(firestore, 'requests'),
      where('donorId', '==', user.uid),
      where('status', 'in', statuses)
    )

    const mergeMap = new Map<string, ConversationEntry>()

    const buildEntry = async (request: RequestType): Promise<ConversationEntry | null> => {
      try {
        const otherId = otherPersonId(request, user.uid)
        const itemId = request.itemId

        const lastMsgQ = query(
          collection(firestore, 'messages'),
          where('requestId', '==', request.id),
          orderBy('createdAt', 'desc')
        )
        const unreadQ = query(
          collection(firestore, 'messages'),
          where('requestId', '==', request.id),
          where('read', '==', false),
          where('senderId', '!=', user.uid) // only count messages from the other person
        )

        const [otherDoc, itemDoc, lastMsgSnap, unreadSnap] = await Promise.all([
          getDoc(doc(firestore, 'users', otherId)),
          getDoc(doc(firestore, 'items', itemId)),
          getDocs(lastMsgQ),
          getDocs(unreadQ),
        ])

        return {
          request,
          otherPerson: { ...otherDoc.data(), id: otherDoc.id } as UserType,
          item: { ...itemDoc.data(), id: itemDoc.id } as ItemType,
          lastMessage: lastMsgSnap.docs[0]?.data()?.content || 'Start a conversation',
          unreadCount: unreadSnap.size,
        }
      } catch {
        return null
      }
    }

    const refresh = async (requests: RequestType[]) => {
      const entries = await Promise.all(requests.map(buildEntry))
      entries.forEach((entry) => {
        if (entry) mergeMap.set(entry.request.id!, entry)
      })
      setConversations(Array.from(mergeMap.values()))
      setIsLoading(false)
    }

    const unsub1 = onSnapshot(asRequesterQ, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as RequestType)
      await refresh(data)
    }, (err) => {
      toast.error("Failed to load messages", { description: FirebaseErrors[err.code] || err.message })
      setIsLoading(false)
    })

    const unsub2 = onSnapshot(asDonorQ, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as RequestType)
      await refresh(data)
    }, (err) => {
      toast.error("Failed to load messages", { description: FirebaseErrors[err.code] || err.message })
      setIsLoading(false)
    })

    return () => { unsub1(); unsub2() }
  }, [user])

  const filtered = useMemo(() => {
    if (!searchTerm) return conversations
    return conversations.filter(c =>
      c.otherPerson?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [conversations, searchTerm])

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
          onChange={(e) => setSearchTerm(e.target.value || null)}
          className="w-full"
        />
      </div>
      <ScrollArea className="flex-grow">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-gray-100 rounded" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description={searchTerm ? "No conversations match your search." : "Accept or make a request to start chatting!"}
            containerClassName="min-h-[40vh]"
          />
        ) : (
          filtered.map(({ request, otherPerson, item, lastMessage, unreadCount }) => (
            <div
              key={request.id}
              className={`flex flex-col cursor-pointer border-b hover:bg-gray-50 transition-colors ${rid === request.id ? 'bg-primary-light' : ''}`}
              onClick={() => setRid(request.id ?? null)}
            >
              <div className="flex flex-row items-center p-4 pb-1">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mr-3 flex-shrink-0">
                  <AvatarImage src={otherPerson?.profileUrl} alt={otherPerson?.name} />
                  <AvatarFallback>{otherPerson?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">{otherPerson?.name}</h3>
                    <StatusBadge requestStatus={request.status as RequestStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 truncate">{lastMessage}</p>
                    {unreadCount > 0 && (
                      <span className="bg-primary text-white text-[10px] rounded-full px-1.5 py-0.5 flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Item preview strip */}
              <div className="flex items-center gap-2 px-4 py-2 border-t bg-gray-50/50">
                <div className="w-6 h-6 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                  {item?.assets?.[0]?.url ? (
                    <Image
                      src={item.assets[0].url}
                      alt={item.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{item?.name}</p>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}
