'use client'
import { SheetContent, SheetHeader } from "./ui/sheet"
import { Skeleton } from "./ui/skeleton"

export default function ItemLoader() {
    return (
        <div className="min-w-[100vw] lg:min-w-[600px] px-0">
            <div className="flex flex-col gap-6 h-full overflow-y-auto pb-24 px-4 md:px-6">
                <SheetHeader>
                    <div className="flex flex-row items-center gap-2 mb-3">
                        <div className="flex flex-row items-center gap-1">
                            <Skeleton className="w-4 h-4 rounded-full" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                    </div>
                    <div className="w-full flex flex-row justify-between items-center pt-3">
                        <div className="flex flex-col items-start gap-2">
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-8 w-[200px]" />
                            <div className="flex flex-row items-center gap-2">
                                <Skeleton className="h-6 w-[80px] rounded-full" />
                                <Skeleton className="h-6 w-[80px] rounded-full" />
                            </div>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                            <Skeleton className="w-2 h-2 rounded-full" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-20 w-full" />
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-[80px]" />
                    <div className="flex flex-row flex-wrap gap-2">
                        {[1,2,3,4].map((i) => (
                            <Skeleton key={i} className="w-[80px] h-[80px] rounded-sm" />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-[80px]" />
                    <div className="flex flex-row items-center gap-2">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <Skeleton className="h-5 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-[80px]" />
                    <div className="flex flex-row items-center gap-2">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-5 w-[200px]" />
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                <Skeleton className="w-[180px] h-10 rounded-full" />
                <Skeleton className="w-[180px] h-10 rounded-full" />
            </div>
        </div>
    )
}
