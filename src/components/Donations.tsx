"use client";

import React, { useState } from "react";
import Link from "next/link";
import ImageCard from "./ui/image-card";
import EmptyState from "./EmptyState";
import { CustomPagination } from "./CustomPagination";
import { CategoryType, PaginatedData } from "@/app/types";
import { ItemType } from "@/app/types";
import { usePathname, useSearchParams } from "next/navigation";
import { Search as SearchIcon, X, MapPin } from "lucide-react";
import { useRef } from "react";

interface DonationsProps {
  donations: PaginatedData<ItemType[]>;
  categories: CategoryType[];
}

export default function Donations({ donations, categories }: DonationsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const cid = searchParams.get("cid") ?? "";
  const radius = searchParams.get("radius") ?? "";
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCategory = categories.find((c) => c.id === cid);

  const RADIUS_OPTIONS = [
    { label: "Nearby (5 km)", value: "5" },
    { label: "Within 15 km", value: "15" },
    { label: "Within 30 km", value: "30" },
    { label: "Any distance", value: "" },
  ];

  const applyRadius = (value: string) => {
    const p = new URLSearchParams(window.location.search);
    value ? p.set("radius", value) : p.delete("radius");
    p.delete("page");
    window.location.search = p.toString();
  };

  const applySearch = (value: string) => {
    const p = new URLSearchParams(window.location.search);
    value ? p.set("q", value) : p.delete("q");
    window.location.search = p.toString();
  };

  const applyCategory = (value: string) => {
    const p = new URLSearchParams(window.location.search);
    value ? p.set("cid", value) : p.delete("cid");
    p.delete("page");
    window.location.search = p.toString();
  };

  const clearSearch = () => {
    const p = new URLSearchParams(window.location.search);
    p.delete("q");
    window.location.search = p.toString();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">

      {/* Page header */}
      <div className="mb-6 pt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Donations</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            {donations?.total > 0
              ? <span>{donations.total} item{donations.total !== 1 ? "s" : ""} available</span>
              : "Find free items from your community"}
          </p>
        </div>
        {donations?.items?.some(i => i.distance != null) && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary bg-primary-light px-3 py-1.5 rounded-full flex-shrink-0 font-medium">
            <MapPin className="w-3.5 h-3.5" />
            Sorted by distance
          </div>
        )}
      </div>

      {/* Sticky search + filter bar */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm pb-4 -mx-4 px-4 pt-3 border-b border-gray-100 mb-6">
        {/* Search input */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <SearchIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search donations..."
            defaultValue={q}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch((e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => applySearch(e.target.value)}
          />
          {q && (
            <button onClick={clearSearch} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Radius filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyRadius(opt.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                radius === opt.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.value && <MapPin className="w-3 h-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category chips — horizontally scrollable */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => applyCategory("")}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !cid
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => applyCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                cid === cat.id
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Active filters summary */}
        {(q || activeCategory) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-500">
            <span>Filtering by:</span>
            {q && (
              <span className="inline-flex items-center gap-1 bg-primary-light text-primary px-2.5 py-1 rounded-full font-medium">
                "{q}"
                <button onClick={clearSearch}><X className="w-3 h-3" /></button>
              </span>
            )}
            {activeCategory && (
              <span className="inline-flex items-center gap-1 bg-primary-light text-primary px-2.5 py-1 rounded-full font-medium">
                {activeCategory.name}
                <button onClick={() => applyCategory("")}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {donations?.items?.length > 0 ? (
        <div className="flex flex-col">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 mb-8">
            {donations.items.map((donation) => (
              <Link key={donation.id} href={`${pathname}?id=${donation.id}`}>
                <ImageCard
                  image={donation?.assets[0]?.url || ""}
                  title={donation?.name || ""}
                  description={donation?.description || ""}
                  itemId={donation?.id || ""}
                  createdBy={donation?.createdBy || ""}
                  distance={donation?.distance}
                  locationName={donation?.locationName}
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
          description={q || activeCategory ? "Try adjusting your search or filters" : "No donations available yet"}
        />
      )}
    </div>
  );
}
