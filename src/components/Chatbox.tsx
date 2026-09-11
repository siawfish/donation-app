import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Smile, Paperclip, X, Check, ShieldBan } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { ItemType, MessageType, RequestType, UserType, RequestStatus, ActivityAction } from '@/app/types'
import { useQueryState } from 'nuqs'
import { FirebaseErrors } from "@/firebase/errors"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot, doc, getDoc, orderBy, getDocs, limit, endBefore, updateDoc, arrayUnion } from "firebase/firestore"
import { useAuth } from '@/firebase/auth/AuthContext'
import { usePathname } from 'next/navigation'
import { storage } from "@/firebase/auth/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { addDoc, serverTimestamp } from "firebase/firestore"
import { getInitials } from '@/lib/utils'
import { startOfDay, format, isToday, isYesterday } from 'date-fns'
import CustomAlert from './CustomAlert'
import { ReportDialog } from './ReportDialog'
import { ConversationMenu } from './ConversationMenu'
import { ConfirmDialog } from './ConfirmDialog'
import { useBlockStatus } from '@/hooks/use-block'

export default function Chatbox() {
  const [newMessage, setNewMessage] = useState('')
  const [rid, setRid] = useQueryState("rid")
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [request, setRequest] = useState<RequestType | null>(null)
  const [recipient, setRecipient] = useState<UserType | null>(null)
  const [item, setItem] = useState<ItemType | null>(null)
  const pathname = usePathname()
  const [mediaPreviews, setMediaPreviews] = useState<Array<{
    file: File;
    previewUrl: string;
    type: 'image' | 'video';
  }>>([]);
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [firstMessage, setFirstMessage] = useState<any>(null)
  const [showReport, setShowReport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [requestAction, setRequestAction] = useState<RequestStatus.COMPLETED | RequestStatus.CANCELLED | null>(null)
  const { blocked, blockedByMe, block, unblock } = useBlockStatus(recipient?.id)

  const getRecipient = useCallback(async (id: string) => {
    try {
      const docRef = doc(collection(firestore, 'users'), id)
      const docSnap = await getDoc(docRef)
      setRecipient(docSnap.data() as UserType)
    } catch (error) {
      toast.error("An error occurred while fetching the recipient", {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    }
  }, [])

  const getItem = useCallback(async (id: string) => {
    try {
      const docRef = doc(collection(firestore, 'items'), id)
      const docSnap = await getDoc(docRef)
      setItem({
        ...docSnap.data(),
        id: docSnap.id
      } as ItemType)
    } catch (error) {
      toast.error("An error occurred while fetching the item", {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    }
  }, [])

  const getRequest = useCallback(async (rid: string) => {
    try {
      const docRef = doc(collection(firestore, 'requests'), rid)
      const docSnap = await getDoc(docRef)
      const requestData = {
        ...docSnap.data(),
        id: docSnap.id
      } as RequestType
      setRequest(requestData)

      // Determine who the OTHER person is (not the current user)
      const otherId = requestData.createdBy === user?.uid
        ? requestData.donorId            // I'm the requester → other = donor
        : requestData.createdBy as string // I'm the donor    → other = requester

      Promise.allSettled([
        getRecipient(otherId),
        getItem(requestData?.itemId as string)
      ])
    } catch (error) {
      toast.error("An error occurred while fetching the request", {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    }
  }, [getRecipient, getItem, user?.uid])

  const groupMessagesByDate = (messages: MessageType[]) => {
    const groups: { [key: string]: MessageType[] } = {}
    
    messages.forEach(message => {
      if (!message.createdAt) return
      
      let date: Date
      try {
        date = new Date(message.createdAt)
        if (isNaN(date.getTime())) {
          date = new Date() 
        }
      } catch {
        date = new Date()
      }

      const key = format(date, 'yyyy-MM-dd')
      if (!groups[key]) groups[key] = []
      groups[key].push(message)
    })
    
    return groups
  }

  useEffect(() => {
    if (!rid || !user) return
    getRequest(rid)
    
    const q = query(
      collection(firestore, 'messages'),
      where('requestId', '==', rid),
      orderBy('createdAt', 'asc'),
      limit(20)
    )
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const messagesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as MessageType)
        setMessages(messagesData)
        if (snapshot.docs.length > 0) {
          setFirstMessage(snapshot.docs[0])
          setLastMessage(snapshot.docs[snapshot.docs.length - 1])
        }
        setHasMore(snapshot.docs.length === 20)

        // Mark unread messages from the other person as read
        const unreadDocs = snapshot.docs.filter(
          d => d.data().read === false && d.data().senderId !== user?.uid
        )
        await Promise.all(
          unreadDocs.map(d => updateDoc(d.ref, { read: true }))
        )
      } catch (error) {
        toast.error("An error occurred while fetching messages", {
          description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
        })
      }
    })
    return () => unsubscribe()
  }, [rid, user, recipient, item, request, getRequest, getRecipient, getItem])

  const loadOlderMessages = async () => {
    if (!firstMessage || !rid || isLoadingMore) return
    
    setIsLoadingMore(true)
    try {
      const q = query(
        collection(firestore, 'messages'),
        where('requestId', '==', rid),
        orderBy('createdAt', 'desc'),
        endBefore(firstMessage),
        limit(20)
      )
      
      const snapshot = await getDocs(q)
      const olderMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MessageType)
      
      if (snapshot.docs.length > 0) {
        setFirstMessage(snapshot.docs[snapshot.docs.length - 1])
        setMessages(prev => [...olderMessages.reverse(), ...prev])
      }
      
      setHasMore(snapshot.docs.length === 20)
    } catch (error) {
      toast.error("Failed to load older messages")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !mediaPreviews.length) || !user || !rid || isSending || blocked) return

    try {
      setIsSending(true)
      const mediaUrls = await Promise.all(
        mediaPreviews.map(async (preview) => {
          const storageRef = ref(storage, `messages/${rid}/${Date.now()}_${preview.file.name}`)
          await uploadBytes(storageRef, preview.file)
          const url = await getDownloadURL(storageRef)
          return {
            type: preview.type,
            url
          }
        })
      )

      await addDoc(collection(firestore, 'messages'), {
        content: newMessage.trim(),
        media: mediaUrls,
        senderId: user.uid,
        recipientId: recipient?.id ?? null,
        requestId: rid,
        read: false,
        createdAt: serverTimestamp()
      })

      // The bell only ever learns about a message via this — without it, a
      // reply just sits in the thread until whoever it's for happens to open
      // it, request-accepted or not.
      if (recipient?.id) {
        addDoc(collection(firestore, 'activities'), {
          recipientId: recipient.id,
          action: ActivityAction.MESSAGE_RECEIVED,
          requestId: rid,
          itemId: item?.id,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          read: false,
          updatedAt: new Date().toISOString()
        }).catch(() => {/* the message itself already sent — a missed notification isn't worth failing that */})
      }

      setNewMessage('')
      setMediaPreviews([])
    } catch (error) {
      toast.error('Failed to send message', {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    } finally {
      setIsSending(false)
    }
  }

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !user || !rid) return

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const allowedVideoTypes = [
      'video/mp4', 
      'video/webm', 
      'video/ogg',
      'video/quicktime'  // This is for .mov files
    ]

    if (mediaPreviews.length + files.length > 5) {
      toast.error('Maximum 5 media files allowed per message')
      event.target.value = ''
      return
    }

    Array.from(files).forEach(file => {
      if (allowedImageTypes.includes(file.type) || allowedVideoTypes.includes(file.type)) {
        const previewUrl = URL.createObjectURL(file)
        setMediaPreviews(prev => [...prev, {
          file,
          previewUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        }])
      } else {
        toast.error('Please upload only images or videos')
      }
    })
    event.target.value = ''
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const updateRequestStatus = async (status: RequestStatus) => {
    if (!rid || !user || !item) {
      throw new Error('Something went wrong')
    }
    toast.loading('Updating request status...', {
      id: 'update-request-status'
    })
    try {
      const requestRef = doc(collection(firestore, 'requests'), rid)
      // updated item donatedTo and donatedOn
      //  record action in activities
      await Promise.all([
        addDoc(collection(firestore, 'activities'), {
          recipientId: recipient?.id,
          action: status === RequestStatus.COMPLETED ? ActivityAction.REQUEST_COMPLETED : ActivityAction.REQUEST_CANCELLED,
          requestId: rid,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid,
          itemId: item?.id,
          read: false,
          updatedAt: new Date().toISOString()
        }),
        updateDoc(requestRef, {
          status,
          updatedAt: new Date().toISOString()
        }),
        updateDoc(doc(collection(firestore, 'items'), item.id), {
          donatedTo: recipient?.id,
          donatedOn: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ])
      getRequest(rid)
      toast.success(`Request marked as ${status.toLowerCase()}`, {
        id: 'update-request-status'
      })
    } catch (error) {
      toast.error("An error occurred while updating the request status", {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred',
        id: 'update-request-status'
      })
    }
  }

  // Clears the conversation from this person's own inbox only — the request
  // itself, and the other person's view of it, are untouched. Deleting a
  // shared transaction record would be destroying someone else's copy of it
  // too, which "delete conversation" was never asking for.
  const handleDeleteConversation = async () => {
    if (!rid || !user) return
    try {
      await updateDoc(doc(collection(firestore, 'requests'), rid), {
        hiddenFor: arrayUnion(user.uid),
      })
      setConfirmDelete(false)
      setRid(null)
      toast.success('Conversation deleted')
    } catch (error) {
      toast.error('Failed to delete conversation', {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-3 sm:p-4 border-b h-[73px] max-h-[73px] flex flex-row justify-between items-center gap-3">
        <div className="flex flex-row items-center gap-2 min-w-0 flex-shrink-0">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={recipient?.profileUrl} alt={recipient?.name} />
            <AvatarFallback>{getInitials(recipient?.name as string)}</AvatarFallback>
          </Avatar>
          <h2 className="text-base sm:text-xl font-semibold truncate max-w-[70px] sm:max-w-[200px]">{recipient?.name}</h2>
        </div>
        {/* Listing in context — kept visible on every breakpoint so the
            conversation always carries what it's actually about. */}
        {
          item && (
            <Link href={`${pathname}?id=${item?.id}`} className="flex flex-row items-center gap-2 min-w-0 flex-1 justify-end sm:justify-start">
              <div className="flex flex-col items-end sm:items-start min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-[160px]">{item?.name}</p>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">View listing</span>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-accent rounded-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                {
                  item?.assets?.[0]?.url && (
                    <Image src={item.assets[0].url} alt={item?.name ?? 'Item'} width={44} height={44} className="rounded-sm w-full h-full object-cover"/>
                  )
                }
              </div>
            </Link>
          )
        }
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Reporting, deleting and blocking all stay available regardless
              of request status — none of them stop mattering once a request
              is cancelled or completed. */}
          {recipient && (
            <ConversationMenu
              onReport={() => setShowReport(true)}
              onDelete={() => setConfirmDelete(true)}
              onBlock={() => { if (blockedByMe) unblock(); else block() }}
              onCancelRequest={request?.status === RequestStatus.ACCEPTED ? () => setRequestAction(RequestStatus.CANCELLED) : undefined}
              onMarkCompleted={request?.status === RequestStatus.ACCEPTED ? () => setRequestAction(RequestStatus.COMPLETED) : undefined}
              blocked={blockedByMe}
              triggerClassName="text-gray-400 hover:text-red-600 hover:bg-red-50"
            />
          )}
          {/* Close button on mobile */}
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setRid(null)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-grow p-2 sm:p-4 h-full lg:h-[calc(100vh-24rem)] relative" onScrollCapture={(e) => {
        const target = e.currentTarget
        if (target.scrollTop === 0 && hasMore) {
          loadOlderMessages()
        }
      }}>
        {messages?.length > 0 ? (
          <>
            {isLoadingMore && (
              <div className="flex justify-center mb-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    {isToday(new Date(date)) ? 'Today' :
                     isYesterday(new Date(date)) ? 'Yesterday' :
                     format(new Date(date), 'MMMM d, yyyy')}
                  </span>
                </div>
                {dateMessages.map((message) => {
                  const isMine = message.senderId === user?.uid
                  return (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                        <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                          {!isMine && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={recipient?.profileUrl} alt={message.senderId} />
                              <AvatarFallback>{getInitials(recipient?.name as string)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-full ${isMine ? 'bg-primary-light text-forest' : 'bg-muted text-foreground'} rounded-2xl px-3.5 py-2.5`}>
                            <MessageContent message={message} />
                          </div>
                        </div>
                        <div className={!isMine ? 'ml-10' : ''}>
                          <MessageMeta message={message} isMine={isMine} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center h-full text-muted-foreground min-h-[300px] sm:min-h-[500px]">
              <div className=''>
                  <Image src="/message.png" alt="chat" width={150} height={150} />
              </div>
              <p className="text-sm">Start a conversation</p>
          </div>
        )}
      </ScrollArea>
      {
        request?.status === RequestStatus.ACCEPTED && blocked && (
          <div className="p-2 sm:p-4 border-t">
            <CustomAlert
              variant="destructive"
              title="You can't message here"
              description={
                blockedByMe
                  ? `You've blocked ${recipient?.name ?? "this person"}. Unblock them from the menu above to keep messaging.`
                  : `${recipient?.name ?? "This person"} isn't receiving messages from you right now.`
              }
              containerClassName="p-4 border-t"
            />
          </div>
        )
      }
      {
        request?.status === RequestStatus.ACCEPTED && !blocked && (
          <div className="p-2 sm:p-4 border-t">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex flex-col">
              {mediaPreviews.length > 0 && 
                <MediaPreview 
                  mediaPreviews={mediaPreviews} 
                  setMediaPreviews={setMediaPreviews} 
                />
              }
              <div className="flex mt-2">
                <div className="flex-grow flex items-end gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*,.mov"
                    onChange={handleFileUpload}
                    multiple
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    type="button"
                    disabled={isSending}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Upload file</span>
                  </Button>
                  <textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    disabled={isSending}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                    className="flex h-10 w-full rounded-md font-cabinetLight border border-input bg-background px-3 py-2 text-sm focus:outline-primary disabled:cursor-not-allowed disabled:opacity-50 flex-grow resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
                    rows={1}
                    style={{ height: 'auto' }}
                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                      const target = e.currentTarget;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10" disabled={isSending}>
                        <Smile className="h-5 w-5" />
                        <span className="sr-only">Emoji picker</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="end">
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button type="submit" className="ml-2" disabled={isSending}>
                  {isSending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">{isSending ? 'Sending...' : 'Send'}</span>
                </Button>
              </div>
            </form>
          </div>
        )
      }
      {
        request?.status === RequestStatus.CANCELLED && (
          <div className="p-2 sm:p-4 border-t">
            <CustomAlert
              variant="destructive"
              title="Request Cancelled"
              description="This request has been cancelled and is no longer active. No further messages can be sent."
              containerClassName="p-4 border-t"
            />
          </div>
        )
      }
      {
        request?.status === RequestStatus.COMPLETED && (
          <div className="p-2 sm:p-4 border-t">
            <CustomAlert
              variant="success"
              title="Request Completed" 
              description="All done — this item has found its new home."
              containerClassName="p-4 border-t"
            />
          </div>
        )
      }

      <ReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        context={{
          recipientName: recipient?.name,
          itemName: item?.name,
          requestId: rid,
          itemId: item?.id,
        }}
        reporterName={user?.displayName ?? undefined}
        reporterEmail={user?.email ?? undefined}
      />

      <ConfirmDialog
        title="Delete this conversation?"
        onConfirm={handleDeleteConversation}
        submitLabel="Delete conversation"
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
      >
        This removes it from your inbox only — {recipient?.name ?? "they"} will still see it on their side. This can&apos;t be undone.
      </ConfirmDialog>

      <ConfirmDialog
        title={requestAction === RequestStatus.CANCELLED ? "Cancel this request?" : "Mark as completed?"}
        onConfirm={async () => { if (requestAction) { await updateRequestStatus(requestAction); setRequestAction(null) } }}
        submitLabel={requestAction === RequestStatus.CANCELLED ? "Cancel request" : "Mark completed"}
        open={!!requestAction}
        onOpenChange={(open) => { if (!open) setRequestAction(null) }}
      >
        {requestAction === RequestStatus.CANCELLED
          ? "This calls off the handover — the item goes back to being available. This can't be undone."
          : "This confirms the item has actually changed hands. This can't be undone."}
      </ConfirmDialog>
    </div>
  )
}

function formatTimestamp(timestamp: any) {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date)
}

/** Timestamp outside the bubble, same side it's on. Sent messages also get a
 *  plain-language status — "Sent" until the other person's Chatbox has
 *  marked it read, then "Delivered". There's no real delivery receipt here,
 *  `read` is just the closest signal available, but the wording is what was
 *  asked for. */
const MessageMeta = ({ message, isMine }: { message: MessageType; isMine: boolean }) => (
  <p className={`text-[11px] text-muted-foreground mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
    {formatTimestamp(message.createdAt)}
    {isMine && <> · {message.read ? 'Delivered' : 'Sent'}</>}
  </p>
)

const MessageContent = ({ message }: { message: MessageType }) => {
  if (message.media && message.media.length > 0) {
    const displayMedia = message.media.slice(0, 4)
    const remainingCount = message.media.length > 4 ? message.media.length - 4 : 0

    return (
      <div>
        <div className={`grid gap-1 mb-2 ${
          message.media.length === 1 ? 'grid-cols-1' : 
          'grid-cols-2'
        }`}>
          {displayMedia.map((media, index) => (
            <div key={index} className={`relative ${
              message.media.length === 3 && index === 0 ? 'col-span-2' : ''
            }`}>
              {media.type === 'image' ? (
                <Image 
                  src={media.url} 
                  alt="Shared image" 
                  width={300}
                  height={300}
                  className={`w-full h-full object-cover rounded-lg ${
                    message.media.length === 1 ? 'max-h-[200px] sm:max-h-[300px]' :
                    message.media.length === 2 ? 'h-[100px] sm:h-[150px]' :
                    message.media.length === 3 && index === 0 ? 'h-[150px] sm:h-[200px]' :
                    'h-[75px] sm:h-[100px]'
                  }`}
                />
              ) : (
                <video 
                  controls 
                  className={`w-full rounded-lg ${
                    message.media.length === 1 ? 'max-h-[200px] sm:max-h-[300px]' :
                    message.media.length === 2 ? 'h-[100px] sm:h-[150px]' :
                    message.media.length === 3 && index === 0 ? 'h-[150px] sm:h-[200px]' :
                    'h-[75px] sm:h-[100px]'
                  }`}
                >
                  <source src={media.url} />
                  Your browser does not support the video tag.
                </video>
              )}
              {index === 3 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <span className="text-white text-lg font-medium">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {message.content && <p className="break-words">{message.content}</p>}
      </div>
    )
  }

  return <p className="break-words">{message.content}</p>
}

const MediaPreview = ({ 
  mediaPreviews, 
  setMediaPreviews 
}: { 
  mediaPreviews: Array<{ file: File; previewUrl: string; type: 'image' | 'video' }>; 
  setMediaPreviews: (previews: Array<{ file: File; previewUrl: string; type: 'image' | 'video' }>) => void;
}) => {
  if (!mediaPreviews.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {mediaPreviews.map((preview, index) => (
        <div key={index} className="relative">
          {preview.type === 'image' ? (
            <Image 
              src={preview.previewUrl} 
              alt="Preview" 
              width={100}
              height={100}
              className="w-[75px] h-[75px] sm:w-[100px] sm:h-[100px] object-cover rounded-lg"
            />
          ) : (
            <video 
              src={preview.previewUrl} 
              className="w-[75px] h-[75px] sm:w-[100px] sm:h-[100px] object-cover rounded-lg" 
              controls
            />
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
            onClick={() => {
              URL.revokeObjectURL(preview.previewUrl)
              setMediaPreviews(mediaPreviews.filter((_, i) => i !== index))
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
