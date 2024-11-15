'use client'

import Link from 'next/link'
import React from 'react'
import CustomButton from './Button'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { useAuth } from '@/firebase/auth/AuthContext'
import { UserTypes } from '@/app/types'
import { getInitials } from '@/lib/utils'

export function ProfileHeader() {
    const { user } = useAuth();
    return (
        <div className="md:flex items-center justify-between flex-wrap">
            <div className="flex flex-col-reverse md:flex-row w-full md:justify-between gap-4 md:gap-0">
                <div className="text-4xl font-cabinetLight tracking-tight flex flex-row flex-wrap items-center gap-2">
                    <span>Welcome, </span>
                    <Avatar className="w-10 h-10 bg-white">
                        <AvatarFallback className="bg-white border border-gray-200">
                            <span className="text-base font-cabinet text-muted-foreground">{getInitials(user?.displayName ?? '')}</span>
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-cabinet">{user?.displayName}</span>
                </div>
                {
                    user?.userType === UserTypes.USER && (
                        <Link href="/explore" className="lg:hidden">
                            <CustomButton 
                                className="!text-primary !p-0 border-none bg-[transparent] rounded-full justify-start w-[150px]" 
                                variant="outline"
                                icon={<SearchIcon className="w-4 h-4" />}
                            >
                                Explore Donations
                            </CustomButton>
                        </Link>
                    )
                }
                {
                    user?.userType === UserTypes.DONOR && (
                        <Link href="/app/donor/add-item" className="lg:hidden">
                            <CustomButton 
                                className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[90px] p-0" 
                                variant="outline"
                                icon={<PlusIcon className="w-4 h-4" />}
                            >
                                List Item
                            </CustomButton>
                        </Link>
                    )
                }
            </div>
          </div>
    )
}
