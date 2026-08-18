import PopularListings from "./PopularListings"
import { Suspense } from "react"
import Footer from "./Footer"
import Navbar from "./ui/navbar"
import HowItWorks from "./HowItWorks"
import Hero from "./Hero"
import { getCategories, getTrendingCategories } from "@/app/app/actions/categories"
import { getPopularItems } from "@/app/app/actions/items"

export async function LandingPage() {
  // Fetched on the server so the first paint already contains listings.
  const { data: popularItems } = await getPopularItems()

  return (
    <div className="flex flex-col min-h-[100dvh] bg-canvas">
      <Navbar />
      <main className="flex-1 bg-canvas">
        <Suspense>
          <Hero
            getTrendingCategoriesAction={getTrendingCategories}
            getCategoriesAction={getCategories}
          />
        </Suspense>

        <HowItWorks />

        <PopularListings items={popularItems ?? []} />
      </main>
      <Footer />
    </div>
  )
}
