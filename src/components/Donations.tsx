"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, X, MapPin, SlidersHorizontal, Loader2 } from "lucide-react";
import ImageCard from "./ui/image-card";
import EmptyState from "./EmptyState";
import { CategoryType, ItemType, PaginatedData, ResponseData } from "@/app/types";
import { useAuth } from "@/firebase/auth/AuthContext";

/**
 * Shape of `getListings`, declared locally on purpose: the actions module has
 * inline "use server" directives, and importing it from a Client Component is
 * rejected by Next. The action is handed down as a prop from the server page.
 */
type LoadListings = (args: {
  page?: number;
  limit?: number;
  query?: string;
  categoryId?: string;
  maxDistanceKm?: number;
}) => Promise<ResponseData<PaginatedData<ItemType[]> | null>>;

interface DonationsProps {
  initial: PaginatedData<ItemType[]>;
  categories: CategoryType[];
  loadListings: LoadListings;
}

const RADIUS_OPTIONS = [
  { label: "Any distance", value: "" },
  { label: "Nearby · 5 km", value: "5" },
  { label: "Within 15 km", value: "15" },
  { label: "Within 30 km", value: "30" },
];

const GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5";

function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white overflow-hidden">
      <div className="aspect-square w-full bg-sand animate-pulse" />
      <div className="p-3.5 space-y-2">
        <div className="h-3.5 w-3/4 bg-sand animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-sand animate-pulse rounded" />
      </div>
    </div>
  );
}

export default function Donations({ initial, categories, loadListings }: DonationsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const cid = searchParams.get("cid") ?? "";
  const radius = searchParams.get("radius") ?? "";

  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Draft search text lives locally so typing stays instant; the URL catches up
  // on a debounce. Without this every keystroke would wait on a server round-trip.
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  // Page 1 always comes from the server render; later pages accumulate here.
  const [extraItems, setExtraItems] = useState<ItemType[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // A fresh server render (filters changed) invalidates everything appended.
  useEffect(() => {
    setExtraItems([]);
    setPage(1);
  }, [initial]);

  const items = useMemo(() => [...initial.items, ...extraItems], [initial.items, extraItems]);
  const hasMore = items.length < initial.total;
  const activeCategory = categories.find((c) => c.id === cid);
  const filtersActive = Boolean(q || cid || radius);

  const setParams = useCallback(
    (changes: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      params.delete("page");
      const qs = params.toString();
      // `scroll: false` keeps the viewport where it is — the old implementation
      // assigned window.location.search, which was a full reload every time.
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  // Debounced search — results follow typing, no Enter, no blur handler.
  useEffect(() => {
    if (draft === q) return;
    const timer = setTimeout(() => setParams({ q: draft }), 350);
    return () => clearTimeout(timer);
  }, [draft, q, setParams]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { data } = await loadListings({
        page: next,
        limit: initial.limit,
        query: q || undefined,
        categoryId: cid || undefined,
        maxDistanceKm: radius ? Number(radius) : undefined,
      });
      if (data?.items?.length) {
        setExtraItems((prev) => [...prev, ...data.items]);
        setPage(next);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, initial.limit, q, cid, radius, loadListings]);

  // Auto-load as the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "600px" } // start fetching before the user reaches the end
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const showingDistances = items.some((i) => i.distance != null);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4">

      {/* Header */}
      <div className="pt-6 mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Explore</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Browse what&apos;s nearby</h1>
          <p className="text-sm text-gray-500 mt-1.5" aria-live="polite">
            {initial.total > 0
              ? `${initial.total} free item${initial.total !== 1 ? "s" : ""}${filtersActive ? " match your filters" : " looking for a new home"}`
              : "Good things from neighbours, free to a new home"}
          </p>
        </div>
        {showingDistances && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-forest bg-lime px-3.5 py-2 rounded-full flex-shrink-0 font-bold">
            <MapPin className="w-3.5 h-3.5" />
            Nearest first
          </div>
        )}
      </div>

      {/* Sticky controls */}
      <div className="sticky top-nav z-20 bg-canvas/95 backdrop-blur-md -mx-4 px-4 pt-3 pb-4 mb-6">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-full px-5 py-3 shadow-sm focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/10 transition-all">
          <SearchIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search items…"
            aria-label="Search items"
            className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {isPending && <Loader2 className="w-4 h-4 text-forest animate-spin flex-shrink-0" />}
          {draft && !isPending && (
            <button
              onClick={() => setDraft("")}
              aria-label="Clear search"
              className="flex-shrink-0 text-gray-400 hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Distance — only meaningful once we have somewhere to measure from.
            Signed-out visitors would otherwise see a filter that silently does nothing. */}
        {user ? (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setParams({ radius: opt.value })}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  radius === opt.value
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                }`}
              >
                {opt.value && <MapPin className="w-3 h-3" />}
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline underline-offset-2"
          >
            <MapPin className="w-3.5 h-3.5" />
            Join free to sort by what&apos;s closest to you
          </Link>
        )}

        {/* Categories */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setParams({ cid: "" })}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              !cid ? "bg-lime text-forest border-lime" : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setParams({ cid: cid === cat.id ? "" : cat.id })}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                cid === cat.id ? "bg-lime text-forest border-lime" : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Active filters */}
        {filtersActive && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <SlidersHorizontal className="w-3 h-3" /> Filters
            </span>
            {q && (
              <button
                onClick={() => setDraft("")}
                className="inline-flex items-center gap-1 bg-primary-light text-primary px-3 py-1 rounded-full font-semibold hover:brightness-95 transition-all"
              >
                “{q}” <X className="w-3 h-3" />
              </button>
            )}
            {activeCategory && (
              <button
                onClick={() => setParams({ cid: "" })}
                className="inline-flex items-center gap-1 bg-primary-light text-primary px-3 py-1 rounded-full font-semibold hover:brightness-95 transition-all"
              >
                {activeCategory.name} <X className="w-3 h-3" />
              </button>
            )}
            {radius && (
              <button
                onClick={() => setParams({ radius: "" })}
                className="inline-flex items-center gap-1 bg-primary-light text-primary px-3 py-1 rounded-full font-semibold hover:brightness-95 transition-all"
              >
                Within {radius} km <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => { setDraft(""); setParams({ q: "", cid: "", radius: "" }); }}
              className="text-gray-400 hover:text-ink font-semibold underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {items.length > 0 ? (
        <>
          <div
            className={`${GRID} transition-opacity duration-200 ${isPending ? "opacity-40" : "opacity-100"}`}
          >
            {items.map((item) => (
              <Link key={item.id} href={`${pathname}?id=${item.id}`} scroll={false}>
                <ImageCard
                  image={item.assets?.[0]?.url || ""}
                  title={item.name || ""}
                  description={item.description || ""}
                  itemId={item.id || ""}
                  createdBy={item.createdBy || ""}
                  distance={item.distance}
                  locationName={item.locationName}
                  orgName={item.orgName}
                />
              </Link>
            ))}
          </div>

          {/* Appending more */}
          {loadingMore && (
            <div className={`${GRID} mt-3 md:mt-5`}>
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {/* Sentinel + manual fallback */}
          <div ref={sentinelRef} className="h-px" />
          <div className="flex justify-center py-10">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-ink text-sm font-bold px-7 py-3 rounded-full hover:border-forest/40 transition-colors disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              items.length > initial.limit && (
                <p className="text-xs text-gray-400">That&apos;s everything · {items.length} items</p>
              )
            )}
          </div>
        </>
      ) : isPending ? (
        <div className={GRID}>
          {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <EmptyState
          title="Nothing here yet"
          description={
            filtersActive
              ? "Try widening your search or clearing a filter"
              : "Be the first to pass something on to your neighbours"
          }
        />
      )}
    </div>
  );
}
