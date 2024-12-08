"use client";

import { ItemType, PaginatedData } from "@/app/types";
import ImageCard from "@/components/ui/image-card";
import Link from "next/link";
import { TabsContent } from "@radix-ui/react-tabs";
import { usePathname } from "next/navigation";
import { CustomPagination } from "./CustomPagination";
import EmptyState from "./EmptyState";

interface WishlistProps {
    wishlist: PaginatedData<ItemType[]>;
}

export default function Wishlist({ wishlist }: WishlistProps) {
    const pathname = usePathname();
    return (
        <TabsContent value={pathname}>
            {
                wishlist?.items?.length > 0 ? (
                    <div className="p-1 flex flex-col">
                        <CustomPagination 
                            total={wishlist.total}
                            page={wishlist.page}
                            limit={wishlist.limit}
                            containerClassName="hidden md:flex"
                        />  
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {wishlist.items.map((wishlistItem) => (
                                <Link key={wishlistItem.id} href={`${pathname}?id=${wishlistItem.id}`}>
                                    <ImageCard
                                        image={wishlistItem.assets[0].url}
                                        title={wishlistItem.name}
                                        description={wishlistItem.description}
                                        itemId={wishlistItem.id}
                                        createdBy={wishlistItem.createdBy}
                                    />
                                </Link>
                            ))}
                        </div>
                        <CustomPagination 
                            total={wishlist.total}
                            page={wishlist.page}
                            limit={wishlist.limit}
                            containerClassName="flex md:hidden mb-0 mt-4"
                        />
                    </div>
                ) : (
                    <EmptyState 
                        title="No items found" 
                        description="You have not listed any items yet" 
                    />
                )
            }
        </TabsContent>
    )
}