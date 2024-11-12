import React from "react"
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"
import { CalendarIcon, EyeIcon, HandIcon, MessageCircleIcon } from "lucide-react"
import CustomAlert from "./CustomAlert"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import CustomButton from "./Button"
import Image from "next/image"

export default function ItemContent() {
    return (
        <SheetContent className="min-w-[100vw] lg:min-w-[600px] px-0">
            <div className="flex flex-col gap-6 h-full overflow-y-auto pb-24 px-4 md:px-6">
                <SheetHeader>
                    <div className="flex flex-row items-center gap-2 mb-3">
                        <div className="flex flex-row items-center gap-1">
                            <EyeIcon className="w-4 h-4" />
                            <p className="text-sm font-medium text-muted-foreground font-cabinetLight mt-[1px]">Viewed 12 times</p>
                        </div>
                    </div>
                    <CustomAlert 
                        title="Contact Donor" 
                        description="You will only be able to contact the donor once you have requested the item and it has been accepted by the donor. This is to protect the donor from receiving unsolicited messages." 
                        variant="warning" 
                    />
                    <div className="w-full flex flex-row justify-between items-center pt-3">
                        <div className="flex flex-col items-start gap-2">
                            <small className="text-muted-foreground font-cabinet">Item Name</small>
                            <SheetTitle className="text-3xl font-cabinet tracking-tight font-bold mb-0 pb-0 leading-[80%]">John Doe</SheetTitle>
                            <div className="flex flex-row items-center gap-2">
                                <Badge variant="outline" className="border-black text-primary">
                                    {/* <EyeIcon className="w-4 h-4" /> */}
                                    <p className="text-xs font-medium text-black font-cabinet px-2 mt-[1px]">Clothing</p>
                                </Badge>
                            </div>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                            <div className="w-[8px] h-[8px] bg-primary rounded-full" />
                            <p className="text-sm font-medium text-muted-foreground font-cabinet mt-[1px]">Good Condition</p>
                        </div>
                    </div>
                </SheetHeader>
                <div className="flex flex-col gap-2">
                    <small className="text-muted-foreground font-cabinet">Description</small>
                    <SheetDescription className="text-black font-cabinetLight text-base">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    </SheetDescription>
                </div>
                <div className="flex flex-col gap-2">
                    <small className="text-muted-foreground font-cabinet">Media</small>
                    <div className="flex flex-row flex-wrap gap-2">
                        {
                            Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="w-[80px] h-[80px] bg-gray-200 rounded-sm">
                                    <Image src="/placeholder.svg" alt="Placeholder" className="rounded-sm" width={80} height={80} />
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <small className="text-muted-foreground font-cabinet">Listed by</small>
                    <div className="flex flex-row items-center gap-2">
                        <Avatar>
                            <AvatarFallback>
                                <p className="text-xs font-medium text-white font-cabinet px-2 mt-[1px]">JD</p>
                            </AvatarFallback>
                            <AvatarImage src="/placeholdr.svg" alt="Placeholder" />
                        </Avatar>
                        <div className="flex flex-col gap-0">
                            <p className="text-base font-medium text-black font-cabinet mt-[1px]">John Doe</p>
                            <p className="text-xs font-medium text-muted-foreground font-cabinetLight mt-[1px]">New York, NY</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <small className="text-muted-foreground font-cabinet">Listed on</small>
                    <div className="flex flex-row items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="text-black font-cabinetLight text-base">12/12/2024</span>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                <CustomButton 
                    variant="outline" 
                    className="w-[180px] border-primary !text-primary rounded-full hover:bg-transparent"
                    onClick={() => {}}
                    disabled={true}
                    icon={<MessageCircleIcon className="w-4 h-4" />}
                >
                    Contact Donor
                </CustomButton>
                <CustomButton 
                    variant="default" 
                    className="w-[180px] rounded-full"
                    onClick={() => {}}
                    icon={<HandIcon className="w-4 h-4" />}
                >
                    Request Item
                </CustomButton>
            </div>
        </SheetContent>
    )
}