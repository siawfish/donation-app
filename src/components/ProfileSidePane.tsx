import { CalendarIcon, PlusIcon } from 'lucide-react'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import CustomButton from './Button'
import React from 'react'
import { SearchIcon } from 'lucide-react'
import { Badge } from './ui/badge'

export function ProfileSidePane({
  type='user'
}: {
  type?: 'donor' | 'user'
}) {
    return (
        <div className="border-l border-gray-200 pl-4 py-6 hidden lg:block">
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
              {
                type === 'user' && (
                  <Link href="/app/user/explore">
                    <CustomButton 
                      className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[170px]" 
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
                  <Link href="/app/donor/add-item">
                    <CustomButton 
                      className="!text-primary border-none bg-[transparent] rounded-full justify-start w-[105px]" 
                      variant="outline"
                      icon={<PlusIcon className="w-4 h-4" />}
                    >
                      List Item
                    </CustomButton>
                  </Link>
                )
              }
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <MailIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">john@example.com</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Phone:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <PhoneIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">+1 (555) 555-5555</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Address:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <MapPinIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">123 Main St, Anytown, <br />Some State, United States</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Account Status:</label>
              <Badge className="text-xs font-cabinet bg-primary text-white w-fit" variant="secondary">Active</Badge>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Account Type:</label>
              <Badge className="text-xs font-cabinet text-black w-[80px] flex flex-row items-center border-black bg-white uppercase border-[1.5px] gap-1" variant="default">
                <span>
                  <UserIcon className="w-4 h-4" />
                </span>
                <span className="mt-[2px]">User</span>
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Last Login On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">12/12/2024</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Last Updated On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">12/12/2024</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Account Created On:</label>
              <div className="flex flex-row items-center gap-1">
                <span>
                  <CalendarIcon className="w-4 h-4 text-black" />
                </span>
                <p className="font-cabinetLight text-base font-medium">12/12/2024</p>
              </div>
            </div>
          </div>
        </div>
    )
}