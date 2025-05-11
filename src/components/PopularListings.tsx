"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import FilterButton from "@/components/FilterButton"
import ImageCard from "./ui/image-card"
import { firestore } from "@/firebase/auth/firebase"
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import { ItemType } from "@/app/types"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import EmptyState from "./EmptyState"

export default function PopularListings() {
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ItemType[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("")
  const [filteredItems, setFilteredItems] = useState<ItemType[]>([])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleFilter = (value: string) => {
    setFilter(value)
  }

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(firestore, 'items'), orderBy('views', 'desc'), limit(4))
        const docs = await getDocs(q)
        if (docs.size > 0) {
          setItems(docs.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
          } as ItemType)))
        }
      } catch (error:any) {
        toast.error(FirebaseErrors[error.code] || error.message)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  // Apply search and filter to items
  useEffect(() => {
    let result = [...items]
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) || 
        item.description.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply category filter
    if (filter) {
      result = result.filter(item => 
        item.categories.some(category => 
          category.name.toLowerCase() === filter.toLowerCase()
        )
      )
    }
    
    setFilteredItems(result)
  }, [items, search, filter])

  if(isLoading) return (
    <div className="p-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-square w-full bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
  )

      
  return (
    <section className="w-full py-24">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-row items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Popular Listings</h1>
            <p className="text-muted-foreground">
              Check out our most popular donations.
            </p>
          </div>
          <div className="flex flex-row items-center gap-4 min-w-[300px]">
            <Input
              type="text"
              placeholder="Search popular items..."
              className="w-full rounded-lg bg-white px-4 py-2"
              value={search}
              onChange={handleSearch}
            />
            <FilterButton 
              value={filter}
              onChange={handleFilter}
              options={[
                {label: "All", value: ""}, 
                {label: "Furniture", value: "furniture"},
                {label: "Clothing", value: "clothing"},
                {label: "Electronics", value: "electronics"},
                {label: "Books", value: "books"}
              ]}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`}>
                <ImageCard
                  image={item.assets[0].url}
                  title={item.name}
                  description={item.description}
                  itemId={item.id}
                  createdBy={item.createdBy}
                />
              </Link>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                title="No items found"
                description="No items found matching your criteria"
                containerClassName="min-h-[300px]"
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-center">
          <Link href="/explore">
            <Button className="px-6 h-12 bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors rounded-full">
              View All Listings
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
} 