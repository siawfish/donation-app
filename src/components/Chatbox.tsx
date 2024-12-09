import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Smile, Paperclip, X, Check } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { DonorType, ItemType, MessageType, RequestType, UserType, UserTypes, RequestStatus, ActivityAction } from '@/app/types'
import { useQueryState } from 'nuqs'
import { FirebaseErrors } from "@/firebase/errors"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot, doc, getDoc, orderBy, getDocs, limit, endBefore, updateDoc } from "firebase/firestore"
import { useAuth } from '@/firebase/auth/AuthContext'
import { usePathname } from 'next/navigation'
import { storage } from "@/firebase/auth/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { addDoc, serverTimestamp } from "firebase/firestore"
import { getInitials } from '@/lib/utils'
import { startOfDay, format, isToday, isYesterday } from 'date-fns'
import { RequestStatusBanner } from './RequestStatusBanner'
import CustomAlert from './CustomAlert'

export default function Chatbox() {
  const [newMessage, setNewMessage] = useState('')
  const [rid, setRid] = useQueryState("rid")
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [request, setRequest] = useState<RequestType | null>(null)
  const [recipient, setRecipient] = useState<UserType | DonorType | null>(null)
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

  const getRecipient = useCallback(async (id: string) => {
    try {
      const docRef = doc(collection(firestore, 'users'), id)
      const docSnap = await getDoc(docRef)
      setRecipient(docSnap.data() as UserType | DonorType)
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
      Promise.allSettled([
        getRecipient(user?.userType === UserTypes.DONOR ? requestData?.createdBy as string : requestData?.donorId as string),
        getItem(requestData?.itemId as string)
      ])
    } catch (error) {
      toast.error("An error occurred while fetching the request", {
        description: FirebaseErrors[error as keyof typeof FirebaseErrors] || 'An error occurred'
      })
    }
  }, [getRecipient, getItem, user])

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
        const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MessageType)
        setMessages(messagesData)
        if (snapshot.docs.length > 0) {
          setFirstMessage(snapshot.docs[0])
          setLastMessage(snapshot.docs[snapshot.docs.length - 1])
        }
        setHasMore(snapshot.docs.length === 20)
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
    if ((!newMessage.trim() && !mediaPreviews.length) || !user || !rid || isSending) return

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
        requestId: rid,
        createdAt: serverTimestamp()
      })

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

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b h-[73px] max-h-[73px] flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold truncate max-w-[150px] md:max-w-[300px]">{recipient?.name}</h2>
        </div>
        {/* Listing in context */}
        {
          item && (
            <div className="hidden sm:flex flex-row items-center gap-2 max-w-[200px]">
              <div className="w-12 h-12 bg-accent rounded-sm flex items-center justify-center">
                {
                  item?.assets[0].url && (
                    <Image src={item?.assets[0].url} alt="Call" width={48} height={48} className="rounded-sm"/>
                  )
                }
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-muted-foreground font-semibold truncate">{item?.name}</p>
                <Link href={`${pathname}?id=${item?.id}`} className="text-xs text-primary">
                  View listing
                </Link>
              </div>
            </div>
          )
        }
        {/* Close button on mobile */}
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setRid(null)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-grow p-2 sm:p-4 h-full lg:h-[calc(100vh-24rem)] relative" onScrollCapture={(e) => {
        const target = e.currentTarget
        if (target.scrollTop === 0 && hasMore) {
          loadOlderMessages()
        }
      }}>
        {request && 
        user?.userType === UserTypes.DONOR && 
        request.status === RequestStatus.ACCEPTED && (
          <RequestStatusBanner 
            request={request} 
            onStatusChange={updateRequestStatus}
          />
        )}
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
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-4 ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex ${message.senderId === user?.uid ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] sm:max-w-[75%]`}>
                      <Avatar className="h-8 w-8 mx-2">
                        <AvatarImage src={`${message.senderId === user?.uid ? user?.profileUrl : recipient?.profileUrl}`} alt={message.senderId} />
                        <AvatarFallback>{message.senderId === user?.uid ? getInitials(user?.displayName as string) : getInitials(recipient?.name as string)}</AvatarFallback>
                      </Avatar>
                      <div className={`max-w-full ${message.senderId === user?.uid ? 'bg-primary text-white' : 'bg-muted'} rounded-lg p-3`}>
                        <MessageContent message={message} />
                      </div>
                    </div>
                  </div>
                ))}
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
        request?.status === RequestStatus.ACCEPTED && (
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
              description="This request has been completed and the item has been successfully donated"
              containerClassName="p-4 border-t"
            />
          </div>
        )
      }
    </div>
  )
}

const MessageContent = ({ message }: { message: MessageType }) => {
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date)
  }

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
        <p className="text-xs mt-1 opacity-70">{formatTimestamp(message.createdAt)}</p>
      </div>
    )
  }

  return (
    <>
      <p className="break-words">{message.content}</p>
      <p className="text-xs mt-1 opacity-70">{formatTimestamp(message.createdAt)}</p>
    </>
  )
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
