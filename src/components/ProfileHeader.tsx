import Link from 'next/link'
import React from 'react'
import CustomButton from './Button'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'

export function ProfileHeader({
    type='user'
}: {
    type?: 'donor' | 'user'
}) {
    return (
        <div className="md:flex items-center justify-between flex-wrap">
            <div className="flex flex-col-reverse md:flex-row w-full md:justify-between gap-4 md:gap-0">
                <div className="text-4xl font-cabinetLight tracking-tight flex flex-row items-center gap-2">
                    <span>Welcome, </span>
                    <Avatar className="w-10 h-10 bg-white">
                        <AvatarFallback className="bg-white border border-gray-200">
                            <span className="text-base font-cabinet text-muted-foreground">JD</span>
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-cabinet">John Doe</span>
                </div>
                {
                    type === 'user' && (
                        <Link href="/app/user/explore" className="lg:hidden">
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
                    type === 'donor' && (
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
