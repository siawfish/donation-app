'use client'
import { CalendarIcon, PlusIcon } from 'lucide-react'
import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import Link from 'next/link'
import CustomButton from './Button'
import React from 'react'
import { SearchIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { useAuth } from '@/firebase/auth/AuthContext'
import { formatRelative } from 'date-fns'

export function ProfileSidePane() {
    const { user } = useAuth();

    return (
        <div className="border-l border-gray-200 pl-4 py-6 hidden lg:block">
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
            <Link href="/explore">
              <CustomButton 
                className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[170px]" 
                variant="outline"
                icon={<SearchIcon className="w-4 h-4" />}
              >
                Explore Donations
              </CustomButton>
            </Link>
            <Link href="/app/donor/add-item">
              <CustomButton 
                className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[105px]" 
                variant="outline"
                icon={<PlusIcon className="w-4 h-4" />}
              >
                List Item
              </CustomButton>
            </Link>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <MailIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Phone:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <PhoneIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">{user?.phoneNumber}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Address:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <MapPinIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">{`${user?.address}, ${user?.city}, ${user?.state}, ${user?.zip}, ${user?.country}`}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Account Status:</label>
              <Badge className="text-xs font-cabinet bg-primary text-white w-fit" variant="secondary">Active</Badge>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Last Login On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium capitalize">
                  {formatRelative(new Date(user?.lastLogin || ''), new Date())}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Last Updated On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium capitalize">
                  {formatRelative(new Date(user?.updatedAt || ''), new Date())}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Account Created On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium capitalize">
                  {formatRelative(new Date(user?.createdAt || ''), new Date())}
                </p>
              </div>
            </div>
          </div>
        </div>
    )
}