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

interface MyDonationsProps {
  donations: PaginatedData<ItemType[]>;
}

export default function MyDonations({donations}: MyDonationsProps) {
    const pathname = usePathname();
    return (
        <TabsContent value={pathname}>
            {
                donations.items.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <CustomPagination 
                            total={donations.total}
                            page={donations.page}
                            limit={donations.limit}
                        />  
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {donations.items.map((donation) => (
                                <Link key={donation.id} href={`/app/donor/my-donations?id=${donation.id}`}>
                                    <ImageCard
                                    image={donation.assets[0].url}
                                    title={donation.name}
                                    description={donation.description}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <EmptyState 
                        title="No donations found" 
                        description="You have not made any donations yet" 
                    />
                )
            }
        </TabsContent>
    )
}
