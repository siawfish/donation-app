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
        
        {/* How It Works Section */}
        <HowItWorks />
        
        {/* Popular Listings Section */}
        <section className="w-full bg-white py-12 md:py-16 md:min-h-screen flex items-center">
          <Suspense>
            <PopularListings />
          </Suspense>
        </section>        
      </main>
      <Footer />
    </div>
  )
}
