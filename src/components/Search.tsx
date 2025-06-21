"use client";

import { CategoryType } from "@/app/types";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState, KeyboardEvent } from "react";

export default function SearchComponent({
    categories
}:{
    categories: CategoryType[]
}){
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showDropdown, setShowDropdown] = useState(false);

    const handleSearch = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        const value = inputRef.current?.value?.trim();
        
        const params = new URLSearchParams();
        
        if (value) {
            params.set('q', value);
        }
        
        if (selectedCategory !== "All") {
            params.set('category', selectedCategory.toLowerCase());
        }
        
        const queryString = params.toString();
        router.push(`/explore${queryString ? `?${queryString}` : ''}`);
        
        // Hide dropdown after search
        setShowDropdown(false);
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setShowDropdown(false);
    };

    return (
        <div className="w-full max-w-2xl mt-6 md:mt-8">
            <div className="relative">
                <div className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <SearchIcon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="What are you looking for?" 
                    className="w-full h-12 md:h-14 pl-12 md:pl-16 pr-24 md:pr-32 rounded-full bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base placeholder-gray-500"
                    onKeyPress={handleKeyPress}
                />
                <div className="absolute right-2 top-1.5 md:top-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="bg-primary hover:bg-opacity-90 text-white rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-sm transition-colors"
                        >
                            <span className="max-w-16 md:max-w-20 truncate">{selectedCategory}</span>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </button>
                        
                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategorySelect(category.name)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                            selectedCategory === category.name ? 'bg-primary text-white hover:bg-primary hover:bg-opacity-90' : 'text-gray-700'
                                        }`}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Search button for mobile */}
                {/* <button 
                    onClick={handleSearch}
                    className="absolute right-20 md:right-28 top-1.5 md:top-2 p-2 md:p-2.5 text-gray-400 hover:text-primary transition-colors"
                    aria-label="Search"
                >
                    <SearchIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button> */}
            </div>
            
            {/* Overlay to close dropdown when clicking outside */}
            {showDropdown && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
}