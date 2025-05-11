"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

export default function SearchComponent(){
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter()

    const handleSearch = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const value = inputRef.current?.value
        if(value) {
            router.push(`/explore?q=${value}`)
        }
    }
    return (
        <div className="w-full max-w-2xl mt-6 md:mt-8">
            <div className="relative">
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="What are you looking for?" 
                    className="w-full h-12 md:h-14 pl-4 md:pl-6 pr-16 md:pr-20 rounded-full bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
                />
                <div className="absolute right-2 top-1.5 md:top-2">
                <button onClick={handleSearch} className="bg-primary hover:bg-primary-light text-white rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-sm">
                    <span>All</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 md:h-4 md:w-4">
                    <path d="m6 9 6 6 6-6"/>
                    </svg>
                </button>
                </div>
            </div>
        </div>
    )
}