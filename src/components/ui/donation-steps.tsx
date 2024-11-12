import { Card, CardContent } from "@/components/ui/card"
import { GiftIcon, SearchIcon, UserPlusIcon, HandIcon } from "lucide-react"
import Image from "next/image"
export default function DonationSteps() {
  const steps = [
    {
      icon: <UserPlusIcon className="h-8 w-8" />,
      title: "Register to give/receive",
      description: "Create an account in a few simple steps to start giving or receiving items.",
    },
    {
      icon: <GiftIcon className="h-8 w-8" />,
      title: "List Your Item",
      description: "As a donor, add images and a detailed description of the item you're donating.",
    },
    {
      icon: <SearchIcon className="h-8 w-8" />,
      title: "Explore Items",
      description: "As a receiver, browse through the catalog of items available for donation.",
    },
    {
      icon: <HandIcon className="h-8 w-8" />,
      title: "Request Item",
      description: "As a receiver, submit a request for the item you need by a single click.",
    },
  ]

  return (
    <section className="flex justify-center w-full py-12 md:py-24 lg:py-32 px-4 md:px-6 bg-white">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="flex items-center justify-center hidden md:block">
            <Image src="/give-3.jpg" alt="How it works" className="rounded-lg" width={700} height={600} />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-left text-3xl font-bold sm:text-5xl">
              How It Works
            </h2>
            <p className="text-left text-gray-700 md:text-xl lg:text-base xl:text-xl max-w-xl">
              Our donation process is simple and straightforward. Follow these steps to give or receive items.
            </p>
            <div className="mx-auto grid grid-cols-1 gap-2 max-w-5xl md:grid-cols-2 mt-4 items-center">
              {steps.map((step, index) => (
                <Card key={index} className="group shadow-none border-none cursor-pointer relative overflow-hidden transition-all duration-300 ease-in-out ">
                  <CardContent className="flex flex-row gap-4">
                    <div className="mb-4 min-w-16 rounded-full bg-gradient-to-br from-[#35a26d] via-[#35a26d] to-[#99c141] p-3 text-white w-16 h-16 flex items-center justify-center transition-transform duration-300">
                      {step.icon}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="mb-2 text-xl font-bold flex items-center">
                        {step.title}
                      </h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}