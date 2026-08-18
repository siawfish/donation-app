"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryType, ResponseData } from "@/app/types";
import { Search, ArrowRight, PackagePlus, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/firebase/auth/AuthContext";

export default function Hero({
  getTrendingCategoriesAction,
  getCategoriesAction,
}: {
  getTrendingCategoriesAction: () => Promise<ResponseData<CategoryType[] | null>>;
  getCategoriesAction: () => Promise<ResponseData<CategoryType[] | null>>;
}) {
  const [trendingCategories, setTrendingCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [_, startTransition] = useTransition();
  const { user } = useAuth();
  const router = useRouter();
  const listHref = user ? "/app/add-item" : "/auth/register";

  useEffect(() => {
    startTransition(async () => {
      try {
        const trending = await getTrendingCategoriesAction();
        setTrendingCategories(trending.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <section className="w-full px-3 sm:px-4 pt-3">
      {/* ── Forest panel ── */}
      <div className="forest-panel relative max-w-[1400px] mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <div className="relative z-10 px-5 sm:px-10 md:px-16 pt-12 md:pt-24 pb-10 md:pb-16 flex flex-col items-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm text-lime text-xs font-medium px-4 py-1.5 rounded-full mb-8 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5" />
            The free community marketplace
          </div>

          {/* Headline */}
          <h1
            className="text-[2.6rem] sm:text-6xl md:text-[5.5rem] font-bold text-white leading-[1] md:leading-[0.98] tracking-tight text-center text-balance max-w-4xl mb-5 md:mb-6 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            Everything here{" "}
            <span className="relative inline-block text-lime">
              is free.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                <path d="M3 9C50 3 150 3 197 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
          </h1>

          <p
            className="text-sm sm:text-base md:text-lg text-white/60 max-w-xl text-center leading-relaxed mb-8 md:mb-10 animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            Neighbours giving good things a second life. Find what you need close to
            home, or pass on what you no longer use — no money, ever.
          </p>

          {/* ── Search — the focal point ── */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-2xl animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            <div className="flex items-center bg-white rounded-full p-2 pl-6 shadow-2xl shadow-black/30 focus-within:ring-4 focus-within:ring-lime/40 transition-shadow">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search sofas, strollers, books, bikes…"
                className="flex-1 bg-transparent text-ink text-base placeholder-gray-400 outline-none px-3 py-2.5 min-w-0"
              />
              <button
                type="submit"
                className="flex items-center gap-2 bg-forest hover:bg-forest-dark text-white font-semibold text-sm pl-5 pr-4 py-3 rounded-full transition-colors flex-shrink-0"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Category quick-links under search */}
          <div
            className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up"
            style={{ animationDelay: "320ms" }}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-24 bg-white/10 animate-pulse rounded-full" />
                ))
              : trendingCategories.slice(0, 5).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/explore?category=${encodeURIComponent(cat.name)}`}
                    className="px-4 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-forest hover:bg-lime hover:border-lime text-xs font-medium transition-all duration-200"
                  >
                    {cat.name}
                  </Link>
                ))}
          </div>

          {/* Secondary CTA */}
          <Link
            href={listHref}
            className="mt-8 md:mt-10 group inline-flex items-center gap-2.5 text-white/80 hover:text-lime text-xs sm:text-sm font-medium transition-colors animate-fade-in-up text-center px-4"
            style={{ animationDelay: "400ms" }}
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-lime text-forest group-hover:scale-110 transition-transform flex-shrink-0">
              <PackagePlus className="w-4 h-4" />
            </span>
            Got something gathering dust? Pass it on in under 2 minutes
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </div>

        {/* ── Marquee ticker ── */}
        <div className="relative z-10 border-t border-white/10 py-4 overflow-hidden">
          <div className="flex w-max animate-marquee gap-0">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center flex-shrink-0">
                {[
                  "100% free, always",
                  "Nearest first",
                  "No fees · no ads",
                  "1,200+ things rehomed",
                  "800+ neighbours",
                  "Give more · waste less",
                ].map((t) => (
                  <span key={`${dup}-${t}`} className="flex items-center text-white/40 text-xs font-medium tracking-widest uppercase whitespace-nowrap px-6">
                    {t}
                    <span className="ml-12 w-1.5 h-1.5 rounded-full bg-lime/50 inline-block" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Floating location chip */}
        <div className="hidden lg:flex absolute top-24 left-12 z-10 items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 animate-float">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-lime text-forest">
            <MapPin className="w-4 h-4" />
          </span>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Near you</p>
            <p className="text-white/50 text-[10px] leading-tight">items sorted by distance</p>
          </div>
        </div>

        {/* Floating free chip */}
        <div className="hidden lg:flex absolute top-44 right-14 z-10 items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "1.2s" }}>
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white text-forest text-xs font-bold">€0</span>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Always free</p>
            <p className="text-white/50 text-[10px] leading-tight">no fees, no catch</p>
          </div>
        </div>
      </div>
    </section>
  );
}
