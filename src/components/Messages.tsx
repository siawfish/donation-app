'use client'

import MessageList from './MessageList'
import Chatbox from './Chatbox'
import Image from 'next/image'
import { useQueryState } from 'nuqs'

export default function Messaging() {
    const [rid] = useQueryState('rid')
    return (
        <div className="space-y-6">
            <div className="mb-2">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Inbox</p>
                <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">Messages</h1>
            </div>
            <div className="flex bg-white h-full max-h-[calc(100vh-12rem)] lg:h-[calc(100vh-15rem)] rounded-3xl border border-gray-200/70 overflow-hidden">
                <div className={`${rid ? 'hidden md:block' : 'w-full'} md:w-1/3 border-r`}>
                    <MessageList />
                </div>
                <div className={`${rid ? 'w-full' : 'hidden'} md:block md:w-2/3`}>
                    {rid ? (
                        <Chatbox />
                        ) : (
                        <div className="flex flex-col gap-4 items-center justify-center h-full text-muted-foreground">
                            <div className=''>
                                <Image src="/message.png" alt="chat" width={150} height={150} />
                            </div>
                            <p className="text-sm">Select a chat to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
  )
}
