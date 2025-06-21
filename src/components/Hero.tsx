"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Logo from "./Logo";
import Search from "./Search";
import { CategoryType, ResponseData } from "@/app/types";

export default function Hero({
  getTrendingCategoriesAction,
  getCategoriesAction
}:{
  getTrendingCategoriesAction: () => Promise<ResponseData<CategoryType[] | null>>,
  getCategoriesAction: () => Promise<ResponseData<CategoryType[] | null>>
}) {
  const [trendingCategories, setTrendingCategories] = useState<CategoryType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [_, startTransition] = useTransition();

  console.log('categories', categories);
  console.log('trendingCategories', trendingCategories);

  useEffect(() => {
    const fetchTrendingCategories = async () => {
      startTransition(async () => {
        try {
          const [trendingCategories, categories] = await Promise.all([getTrendingCategoriesAction(), getCategoriesAction()]);
          setTrendingCategories(trendingCategories.data!);
          setCategories(categories.data!);
        } catch (error) {
          console.error("Error fetching trending categories:", error);
        } finally {
          setLoading(false);
        }
      });
    };

    fetchTrendingCategories();
  }, []);

  return (
    <section className="w-full flex justify-center items-center py-16 md:min-h-[calc(100vh-56px)]">
      <div className="container px-4 md:px-6 max-w-5xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="hidden md:block">
            <Logo width={200} height={69.6} />
          </div>
          <div className="block md:hidden">
            <Logo width={100} height={34.8} />
          </div>
          <Search categories={categories} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-6 md:mt-8">
          <div className="text-xs md:text-sm text-gray-500">Trending categories</div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div 
                  key={index}
                  className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-200 animate-pulse h-7 md:h-9 w-16 md:w-20"
                />
              ))
            ) : (
              trendingCategories.slice(0, 4).map((category) => (
                <Link 
                  key={category.id} 
                  href={`/explore?category=${encodeURIComponent(category.name)}`}
                  className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs md:text-sm text-gray-800 transition-colors"
                >
                  {category.name}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
} 