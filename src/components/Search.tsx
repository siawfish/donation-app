"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

export default function SearchComponent(){
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter()

    const handleSearch = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const value = inputRef.current?.value
        if(value) {
            router.push(`/explore?q=${value}`)
        }
    }
    return (
        <div key={3} className="flex items-center justify-center !my-8 relative w-full">
            <input ref={inputRef} type="text" placeholder="Search for items" className="input input-bordered w-full focus:outline-none h-16 rounded-full px-4 w-full" />
            <Link href="#" onClick={handleSearch} className="absolute right-4 top-0 bottom-0 flex items-center justify-center">
                <Search className="size-6 text-primary z-10 cursor-pointer" />
            </Link>
        </div>
    )
}