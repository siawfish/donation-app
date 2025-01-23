import { Card, CardContent } from "@/components/ui/card"
import { GiftIcon, SearchIcon, UserPlusIcon, HandIcon, MessageCircleIcon } from "lucide-react"
import Image from "next/image"

const steps = [
  {
    icon: <UserPlusIcon className="h-[24px] w-[24px]" />,
    title: "Register",
    description: "Sign up in just a few steps to join the Givny community. Create a profile so you can start sharing or requesting items..",
  },
  {
    icon: <GiftIcon className="h-[24px] w-[24px]" />,
    title: "List",
    description: "Have something you no longer need? Take a photo, add a short description, and list it on the platform for others to see.",
  },
  {
    icon: <SearchIcon className="h-[24px] w-[24px]" />,
    title: "Explore",
    description: "Browse through available items near you. Use categories and filters to find exactly what you're looking for, quickly and easily.",
  },
  {
    icon: <MessageCircleIcon className="h-[24px] w-[24px]" />,
    title: "Request",
    description: "Found something you need? Send a request to the donor with a brief message.",
  },
  {
    icon: <HandIcon className="h-[24px] w-[24px]" />,
    title: "Receive",
    description: "Once your request is approved, coordinate with the donor to pick up your item. It's that simple!",
  }
]


export default function DonationSteps({
  showImage = true,
  contentClassName = "",
  containerClassName = "",
  contentHeaderClassName = "",
  titleClassName = "",
  descriptionClassName = ""
}: {
  showImage?: boolean
  contentClassName?: string
  containerClassName?: string
  contentHeaderClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}) {
  return (
    <section className={`flex justify-center w-full py-12 md:py-24 lg:py-32 px-4 md:px-6 bg-white ${containerClassName}`}>
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">
          {showImage && (
            <div className="hidden lg:block">
              <Image src="/give-5.jpg" alt="Donation Steps" className="rounded-lg" width={500} height={750} />
            </div>
          )}
          <div className={`flex flex-col justify-center gap-12 ${contentClassName}`}>
            <div className={`flex flex-col items-start gap-4 self-start ${contentHeaderClassName}`}>
              <h2 className={`text-left text-3xl font-bold sm:text-5xl ${titleClassName}`}>
                How It Works
              </h2>
              <p className={`text-left text-gray-700 md:text-xl lg:text-base xl:text-xl max-w-xl ${descriptionClassName}`}>
                Our donation process is simple and straightforward. Follow these steps to give or receive items.
              </p>
            </div>
            <div className="flex flex-wrap flex-row items-center gap-12 max-w-5xl">
              {steps.map((step, index) => (
                <Card key={index} className="group bg-secondary cursor-pointer relative overflow-hidden transition-all duration-300 ease-in-out p-6 max-w-[30%] min-w-full md:min-w-[300px]">
                  <CardContent className="flex flex-col gap-4 px-0">
                    <div className="min-w-[32px] rounded-full bg-gradient-to-br from-[#35a26d] via-[#35a26d] to-[#99c141] text-white w-[40px] h-[40px] flex items-center justify-center transition-transform duration-300">
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