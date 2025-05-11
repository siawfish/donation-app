import Link from "next/link"
import Logo from "./Logo"
import PopularListings from "./PopularListings"
import { Suspense } from "react"
import Footer from "./Footer"
import Navbar from "./ui/navbar"
import HowItWorks from "./HowItWorks"
import Search from "./Search"
export function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1 bg-white">
        {/* Hero Section */}
        <section className="w-full flex justify-center items-center py-16 md:min-h-[calc(100vh-56px)]">
          <div className="container px-4 md:px-6 max-w-5xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="hidden md:block">
                <Logo width={200} height={69.6} />
              </div>
              <div className="block md:hidden">
                <Logo width={100} height={34.8} />
              </div>
              <Search />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-6 md:mt-8">
              <div className="text-xs md:text-sm text-gray-500">Trending categories</div>
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                {["furniture", "clothing", "electronics", "books"].map((item) => (
                  <Link 
                    key={item} 
                    href="#" 
                    className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs md:text-sm text-gray-800"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
        
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
