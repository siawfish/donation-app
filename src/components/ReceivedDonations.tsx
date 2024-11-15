"use client";

import { CustomPagination } from "@/components/CustomPagination";
import ImageCard from "@/components/ui/image-card";
import { TabsContent } from "@/components/ui/tabs";
import React from "react";
import { PaginatedData, ItemType } from "@/app/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EmptyState from "./EmptyState";

interface ReceivedDonationsProps {
  donations: PaginatedData<ItemType[]>;
}

export default function ReceivedDonations({donations}: ReceivedDonationsProps) {
    const pathname = usePathname();
    return (
        <TabsContent value={pathname}>
            {
                donations?.items?.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <CustomPagination 
                            total={donations.total}
                            page={donations.page}
                            limit={donations.limit}
                            containerClassName="hidden md:flex"
                        />  
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {donations.items.map((request) => (
                                <Link key={request.id} href={`${pathname}?id=${request.id}`}>
                                    <ImageCard
                                        image={request.assets[0].url}
                                        title={request.name}
                                        description={request.description}
                                    />
                                </Link>
                            ))}
                        </div>
                        <CustomPagination 
                            total={donations.total}
                            page={donations.page}
                            limit={donations.limit}
                            containerClassName="flex md:hidden mb-0 mt-4"
                        />
                    </div>
                ) : (
                    <EmptyState 
                        title="No donations found" 
                        description="You have not received any donations yet" 
                    />
                )
            }
        </TabsContent>
    )
}
