'use client'

import MessageList from './MessageList'
import Chatbox from './Chatbox'
import Image from 'next/image'
import { useQueryState } from 'nuqs'

export default function Messaging() {
    const [rid] = useQueryState('rid')
    return (
        <div className="container mx-auto space-y-6 px-4 max-w-7xl">
            <div className="flex bg-background h-full max-h-[calc(100vh-12rem)] lg:h-[calc(100vh-15rem)] rounded-md border">
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
