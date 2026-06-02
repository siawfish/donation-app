import PopularListings from "./PopularListings"
import { Suspense } from "react"
import Footer from "./Footer"
import Navbar from "./ui/navbar"
import HowItWorks from "./HowItWorks"
import Hero from "./Hero"
import { getCategories, getTrendingCategories } from "@/app/app/actions/categories"

export function LandingPage() {
  const getTrendingCategoriesAction = getTrendingCategories;
  const getCategoriesAction = getCategories;
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1 bg-white">
        {/* Hero Section */}
        <Suspense>
          <Hero getTrendingCategoriesAction={getTrendingCategoriesAction} getCategoriesAction={getCategoriesAction} />
        </Suspense>

        <HowItWorks />

        <Suspense>
          <PopularListings />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
