import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Navbar from "./ui/navbar"
import { Search } from "lucide-react"
import AnimatedHeader from "./ui/animated-header"
import { AnimatedGroup } from "./ui/animated-group"
import DonationSteps from "./ui/donation-steps"
import { SlidingListings } from "./ui/sliding-listings"
import Image from "next/image"
import SearchComponent from "./Search"

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1 bg-secondary">
        <section className="w-full flex justify-center py-12 sm:py-24 lg:py-32 bg-[url('/img-1.jpg')] bg-cover bg-center bg-no-repeat relative">
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col justify-center space-y-4 min-h-[600px]">
              <AnimatedGroup 
                className="space-y-2 flex flex-col items-center justify-center w-full max-w-[600px] mx-auto"
                variants={{
                  item: {
                    visible: {
                      width: '100%',
                    }
                  }
                }}
              >
                <AnimatedHeader key={1} />
                <p key={2} className="text-secondary md:text-lg text-center">
                  Our app makes it simple to donate items you no longer need or request specific items you require.
                  Join our community and make a difference.
                </p>
                <SearchComponent />
              </AnimatedGroup>
            </div>
          </div>
        </section>
        <section className="flex justify-center w-full py-12 md:py-24 lg:py-32 px-4 md:px-6">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="flex flex-col gap-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Why we do this.
                </h2>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We believe that everyone deserves a chance to thrive, and that starts with having the basic necessities.
                  That&apos;s why we&apos;re committed to making sure everyone has access to the things they need to live a healthy and happy life.
                </p>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We&apos;re a community-driven platform that connects those in need with those who have extra items to spare.
                  Our mission is to make it easy and convenient for people to give and receive items, helping to reduce waste and promote sustainability.
                </p>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Together, we can create a more sustainable and equitable world, where everyone has the opportunity to thrive.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Image src="/give-1.jpg" alt="Why we do this" className="rounded-lg" width={650} height={550} />
              </div>
            </div>
          </div>
        </section>
        <DonationSteps />
        <SlidingListings />
        <section className="flex justify-center w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Community Impact</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Hear from Our Users</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our app has helped countless individuals and families in need. Read the stories of those who have been
                  impacted by the generosity of our community.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="grid gap-4 rounded-lg border bg-background p-6">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">Jessica Davis</p>
                      <p className="text-sm text-muted-foreground">Donated winter coats</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">
                    {`"I was able to donate several winter coats that my family no longer needed. The process was so easy,
                    and I'm grateful to have found a way to give back to my community."`}
                  </p>
                </div>
                <div className="grid gap-4 rounded-lg border bg-background p-6">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>TM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">Thomas Miller</p>
                      <p className="text-sm text-muted-foreground">Requested school supplies</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">
                    {`"I was struggling to afford school supplies for my kids, and this app was a lifesaver. The community
                    came together to fulfill my request, and my children were able to start the school year with
                    everything they needed."`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="grid gap-4 rounded-lg border bg-background p-6">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">Donated household items</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">
                    {`"I had so many household items that were just taking up space in my home. Being able to donate them
                    through this app was a game-changer. I'm glad my items could be put to good use."`}
                  </p>
                </div>
                <div className="grid gap-4 rounded-lg border bg-background p-6">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>LW</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">Lisa Wilson</p>
                      <p className="text-sm text-muted-foreground">Requested baby items</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">
                    {`"As a new mom, I was overwhelmed by the cost of baby items. This app allowed me to request the
                    specific things I needed, and the community responded with generosity. I'm so grateful for the
                    support."`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="flex justify-center w-full py-12 md:py-24 lg:py-32 bg-primary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-5xl">
                  Ready to Make a Difference?
                </h2>
                <p className="max-w-[600px] text-white md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join our community and start donating or requesting items today. Together, we can create a more
                  sustainable and equitable world.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link
                  href="/auth/register/donor"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-primary shadow transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  prefetch={false}
                >
                  List an Item
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Donate It. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
