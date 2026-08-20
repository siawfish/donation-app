import Footer from "./Footer"
import Navbar from "./ui/navbar"
import HowItWorks from "./HowItWorks"
import Hero from "./Hero"
import { HomeListings } from "./home/HomeListings"
import { getCategories } from "@/app/app/actions/categories"
import { getHomeFeed } from "@/app/app/actions/items"
import { HomeJournal } from "./home/HomeJournal"
import { listPublishedPosts } from "@/app/app/actions/blog"

export async function LandingPage() {
  // Both resolved on the server so the first paint already contains listings —
  // and the hero can size its message to what's actually in stock.
  const [{ data: feed }, categories, posts] = await Promise.all([
    getHomeFeed(),
    getCategories(),
    listPublishedPosts(),
  ])

  const categoryList = categories.data ?? []

  // Counts come from the same pool the rails use, so the hero chips can never
  // point at an empty category.
  const heroCategories = categoryList
    .map((c) => ({ id: c.id, name: c.name, count: feed?.categoryCounts?.[c.id] ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col min-h-[100dvh] bg-canvas">
      <Navbar />
      <div className="flex-1 bg-canvas">
        <Hero
          totalAvailable={feed?.totalAvailable ?? 0}
          categories={heroCategories}
        />

        {feed && <HomeListings feed={feed} categories={categoryList} />}

        <HowItWorks />

        <HomeJournal posts={posts.slice(0, 3)} />
      </div>
      <Footer />
    </div>
  )
}
