import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { ProfileSidePane } from "./ProfileSidePane"
import { ProfileHeader } from "./ProfileHeader"
import ImageCard from "./ui/image-card"
import { CustomPagination } from "./CustomPagination"

const donations = [
  {
    id: 1,
    name: "John Doe",
    category: "Food Bank",
    description: "Donation to support local food bank.",
    image: "/placeholder.svg",
  },
  {
    id: 2,
    name: "Jane Smith",
    category: "Disaster Relief",
    description: "Donation to help with disaster relief efforts.",
    image: "/placeholder.svg",
  },
  {
    id: 3,
    name: "Michael Johnson",
    category: "Education",
    description: "Donation to fund educational scholarships.",
    image: "/placeholder.svg",
  },
  {
    id: 4,
    name: "Emily Davis",
    category: "Animal Rescue",
    description: "Donation to support animal rescue organization.",
    image: "/placeholder.svg",
  },
  {
    id: 5,
    name: "David Wilson",
    category: "Medical Research",
    description: "Donation to help with medical research.",
    image: "/placeholder.svg",
  },
  {
    id: 6,
    name: "Sarah Lee",
    category: "Community Center",
    description: "Donation to support local community center.",
    image: "/placeholder.svg",
  },
  {
    id: 7,
    name: "Tom Brown",
    category: "Environmental Conservation",
    description: "Donation to help with environmental conservation efforts.",
    image: "/placeholder.svg",
  },
  {
    id: 8,
    name: "Olivia Anderson",
    category: "Youth Development",
    description: "Donation to support youth development programs.",
    image: "/placeholder.svg",
  },
  // {
  //   id: 9,
  //   name: "Daniel Martinez",
  //   category: "Disaster Relief",
  //   description: "Donation to help with disaster relief efforts.",
  //   image: "/placeholder.svg",
  // },
  // {
  //   id: 10,
  //   name: "Sophia Hernandez",
  //   category: "Animal Shelter",
  //   description: "Donation to support local animal shelter.",
  //   image: "/placeholder.svg",
  // },
];

export default function User() {
  return (
    <div className="container max-w-8xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[80%_20%] gap-4">
        <div className="flex flex-col gap-6">
          
          <ProfileHeader />

          <Tabs defaultValue="ongoing">
            <TabsList className="border-b">
              <TabsTrigger value="ongoing">Requested Items</TabsTrigger>
              <TabsTrigger value="past">Received Items</TabsTrigger>
            </TabsList>
            <TabsContent value="ongoing">
              <div className="p-1 flex flex-col">
                <CustomPagination />  
                {/* TODO: List requested items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                  {donations.map((donation) => (
                    <Link key={donation.id} href={`/app/user/donation`}>
                      <ImageCard
                        image={donation.image}
                        title={donation.category}
                        description={donation.description}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="past">
              <div className="p-1 flex flex-col">
                <CustomPagination />
                {/* TODO: List received items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {donations.map((donation) => (
                    <Link key={donation.id} href={`/app/user?id=${donation.id}`}>
                        <ImageCard
                        image={donation.image}
                        title={donation.category}
                        description={donation.description}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <ProfileSidePane />
      </div>
    </div>
  )
}
