"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import ImageCard from "./ui/image-card";
import EmptyState from "./EmptyState";
import { CustomPagination } from "./CustomPagination";
import { CategoryType, PaginatedData } from "@/app/types";
import { ItemType } from "@/app/types";
import { usePathname, useSearchParams } from "next/navigation";
import FilterButton from "./FilterButton";

interface DonationsProps {
  donations: PaginatedData<ItemType[]>;
  categories: CategoryType[]
}

export default function Donations({
  donations,
  categories
}:DonationsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const q = searchParams.get("q")
  const cid = searchParams.get("cid")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value;
      handleQuery(value);
    }
  };

  const handleQuery = (value:string)=> {
    const searchParams = new URLSearchParams(window.location.search);
    if(value) {
      searchParams.set('q', value);
      window.location.search = searchParams.toString();
      return;
    }
    searchParams.delete('q');
    window.location.search = searchParams.toString();
  }

  const handleCategory = (value:string)=>{
    const searchParams = new URLSearchParams(window.location.search);
    if(value) {
      searchParams.set('cid', value);
      window.location.search = searchParams.toString();
      return;
    }
    searchParams.delete('cid');
    window.location.search = searchParams.toString();
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-row items-center justify-between flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Listings</h1>
          <p className="text-muted-foreground mb-8">
            Find the perfect donation for your cause.
          </p>
        </div>
        <div className="flex flex-row items-center gap-4 min-w-[300px]">
          <Input
            type="text"
            placeholder="Search donations..."
            className="w-full rounded-lg bg-white px-4 py-2"
            onKeyDown={handleKeyDown}
            defaultValue={q!}
            onBlur={(e)=>handleQuery(e.target.value)}
          />
          <FilterButton 
            value={cid!}
            onChange={handleCategory}
            options={[{label: "All", value: ""}, ...categories.map(c=>{
              return {
                label: c.name,
                value: c.id
              }
            })]}
          />
        </div>
      </div>
      {
        donations?.items?.length > 0 ? (
            <div className="p-1 flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {donations.items.map((donation) => (
                        <Link key={donation.id} href={`${pathname}?id=${donation.id}`}>
                            <ImageCard
                              image={donation.assets[0].url}
                              title={donation.name}
                              description={donation.description}
                            />
                        </Link>
                    ))}
                </div>
                  <CustomPagination 
                    total={donations.total}
                    page={donations.page}
                    limit={donations.limit}
                  />  
            </div>
        ) : (
            <EmptyState 
              title="No listings found" 
              description="Oops no items have been listed yet" 
            />
        )
      }
    </div>
  );
}
