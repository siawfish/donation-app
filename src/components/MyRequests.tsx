"use client";

import { CustomPagination } from "@/components/CustomPagination";
import ImageCard from "@/components/ui/image-card";
import { TabsContent } from "@/components/ui/tabs";
import React from "react";
import { PaginatedData, ItemType } from "@/app/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import EmptyState from "./EmptyState";

interface MyRequestsProps {
  requests: PaginatedData<ItemType[]>;
}

export default function MyRequests({requests}: MyRequestsProps) {
    const pathname = usePathname();
    return (
        <TabsContent value={pathname}>
            {
                requests?.items?.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <CustomPagination 
                            total={requests.total}
                            page={requests.page}
                            limit={requests.limit}
                            containerClassName="hidden md:flex"
                        />  
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {requests.items.map((request) => (
                                <Link key={request.id} href={`${pathname}?id=${request.id}`}>
                                    <ImageCard
                                        image={request?.assets?.[0]?.url}
                                        title={request?.name}
                                        description={request?.description}
                                        itemId={request?.id || ""}
                                    />
                                </Link>
                            ))}
                        </div>
                        <CustomPagination 
                            total={requests.total}
                            page={requests.page}
                            limit={requests.limit}
                            containerClassName="flex md:hidden mb-0 mt-4"
                        />
                    </div>
                ) : (
                    <EmptyState 
                        title="No requests found" 
                        description="You have not made any requests yet" 
                    />
                )
            }
        </TabsContent>
    )
}
