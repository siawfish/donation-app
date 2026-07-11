"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CategoryType, ResponseData } from "@/app/types";
import { Search, PackagePlus } from "lucide-react";
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
  const [_, startTransition] = useTransition();
  const { user } = useAuth();
  const listHref = user ? "/app/add-item" : "/auth/register";

  useEffect(() => {
    startTransition(async () => {
      try {
        const trending = await getTrendingCategoriesAction();
        const seen = new Set<string>();
        const unique = (trending.data ?? []).filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        setTrendingCategories(unique);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative w-full flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-20 overflow-hidden bg-white">

      {/* Dot grid background */}
      <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />

      {/* Gradient orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-primary/6 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-primary/4 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-medium px-3.5 py-1.5 rounded-full mb-6 animate-fade-in-up">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          100% free · community-driven
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 leading-[1.05] mb-5 text-center max-w-3xl animate-fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          Give more.<br />Waste less.
        </h1>

        <p
          className="text-lg md:text-xl text-gray-500 max-w-lg mx-auto leading-relaxed text-center mb-12 animate-fade-in-up"
          style={{ animationDelay: "160ms" }}
        >
          A free community marketplace — find things you need nearby, or pass on what you no longer use.
        </p>

        {/* Dual CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto animate-fade-in-up"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/explore"
            className="flex items-center justify-center gap-2.5 bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-150 shadow-sm hover:shadow-md"
          >
            <Search className="w-5 h-5" />
            Browse free items
          </Link>
          <Link
            href={listHref}
            className="flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-150 shadow-lg shadow-primary/25 hover:shadow-primary/35"
          >
            <PackagePlus className="w-5 h-5" />
            List something for free
          </Link>
        </div>

        {/* Trending categories */}
        <div
          className="mt-12 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up"
          style={{ animationDelay: "320ms" }}
        >
          <span className="text-xs text-gray-400 mr-1">Popular:</span>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 w-20 bg-gray-100 animate-pulse rounded-full" />
              ))
            : trendingCategories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/explore?category=${encodeURIComponent(cat.name)}`}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-gray-200 hover:border-primary hover:bg-primary-light hover:text-primary text-xs text-gray-600 font-medium transition-all duration-150 shadow-sm"
                >
                  {cat.name}
                </Link>
              ))}
        </div>

        {/* Social proof numbers */}
        <div
          className="mt-14 grid grid-cols-3 gap-8 sm:gap-16 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          {[
            { value: "1,200+", label: "Items listed" },
            { value: "800+", label: "Community members" },
            { value: "100%", label: "Always free" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className="text-xs text-gray-400 text-center">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
