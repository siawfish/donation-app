import { Suspense } from "react"
import Footer from "./Footer"
import Navbar from "./ui/navbar"
import HowItWorks from "./HowItWorks"
import Hero from "./Hero"
import { HomeListings } from "./home/HomeListings"
import { getCategories, getTrendingCategories } from "@/app/app/actions/categories"
import { getHomeFeed } from "@/app/app/actions/items"

export async function LandingPage() {
  // Both resolved on the server so the first paint already contains listings.
  const [{ data: feed }, categories] = await Promise.all([
    getHomeFeed(),
    getCategories(),
  ])

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

        {feed && <HomeListings feed={feed} categories={categories.data ?? []} />}

        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
