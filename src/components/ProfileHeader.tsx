'use client'

import Link from 'next/link'
import React from 'react'
import CustomButton from './Button'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { useAuth } from '@/firebase/auth/AuthContext'
import { usePathname } from 'next/navigation'

function getPageName(pathname: string) {
    if(pathname.includes('my-donations')) {
        return 'Donations'
    }
    return 'Listings'
}

export function ProfileHeader() {
    const { user } = useAuth();
    const pathname = usePathname();
    return (
        <div className="md:flex items-center justify-between flex-wrap">
            <div>
                <h2 className="text-xl font-semibold">{`${user?.displayName?.split(' ')[0]}'s, ${getPageName(pathname)}`}</h2>
            </div>
            <div className="flex flex-col-reverse md:flex-row w-full md:justify-between gap-4 md:gap-0">
                
                
            <Link href="/explore" className="lg:hidden">
                <CustomButton 
                    className="!text-primary !p-0 border-none bg-[transparent] rounded-full justify-start w-[150px]" 
                    variant="outline"
                    icon={<SearchIcon className="w-4 h-4" />}
                >
                    Explore Donations
                </CustomButton>
            </Link>
            <Link href="/app/donor/add-item" className="lg:hidden">
                <CustomButton 
                    className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[90px] p-0" 
                    variant="outline"
                    icon={<PlusIcon className="w-4 h-4" />}
                >
                    List Item
                </CustomButton>
            </Link>
            </div>
          </div>
    )
}
