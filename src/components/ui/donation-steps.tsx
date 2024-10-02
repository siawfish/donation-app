import { Card, CardContent } from "@/components/ui/card"
import { GiftIcon, ImageIcon, UserPlusIcon, SearchIcon, HandIcon } from "lucide-react"

export default function DonationSteps() {
  const steps = [
    {
      icon: <GiftIcon className="h-8 w-8" />,
      title: "Register to Give",
      description: "Have an item you want to give away? Create a profile to get started.",
    },
    {
      icon: <ImageIcon className="h-8 w-8" />,
      title: "List Your Item",
      description: "Add images and a detailed description of the item you're donating.",
    },
    {
      icon: <UserPlusIcon className="h-8 w-8" />,
      title: "Create Account",
      description: "If you're in need, register to create your account.",
    },
    {
      icon: <SearchIcon className="h-8 w-8" />,
      title: "Browse Catalog",
      description: "Look through our catalog of items listed for donation.",
    },
    {
      icon: <HandIcon className="h-8 w-8" />,
      title: "Request Item",
      description: "Found something you need? Submit a request for the item.",
    },
  ]

  return (
    <section className="py-12 md:py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10" />
      <div className="container-fluid mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-br from-[#35a26d] via-[#35a26d] to-[#99c141]">
            How It Works
          </h2>
          <p className="max-w-[900px] text-gray-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Our donation process is simple and straightforward. Follow these steps to give or receive items.
          </p>
        </div>
        <div className="mx-auto grid grid-cols-1 gap-4 max-w-7xl md:grid-cols-3 lg:grid-cols-5 mt-12">
          {steps.map((step, index) => (
            <Card key={index} className="group shadow-none border-none cursor-pointer relative overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="mb-4 rounded-full bg-gradient-to-br from-[#35a26d] via-[#35a26d] to-[#99c141] p-3 text-white w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold flex items-center">
                  <span className="text-3xl font-extrabold text-primary mr-2">{index + 1}.</span>
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}