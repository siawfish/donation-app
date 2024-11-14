import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { ProfileSidePane } from "./ProfileSidePane"
import { ProfileHeader } from "./ProfileHeader"
import ImageCard from "./ui/image-card"
import { CustomPagination } from "./CustomPagination"
import { ItemType, PaginatedData } from "@/app/types";

interface DonorProps {
  donations: PaginatedData<ItemType[]>;
}

export default function Donor({ donations }: DonorProps) {
  return (
    <div className="container max-w-8xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[80%_20%] gap-4">
        <div className="flex flex-col gap-6">
          
          <ProfileHeader />

          <Tabs defaultValue="ongoing">
            <TabsList className="border-b">
              <TabsTrigger value="ongoing">Listed Items</TabsTrigger>
              <TabsTrigger value="past">Donated Items</TabsTrigger>
            </TabsList>
            <TabsContent value="past">
              <div className="p-1 flex flex-col">
                <CustomPagination 
                  total={donations.total}
                  page={donations.page}
                  limit={donations.limit}
                />
                {/* TODO: List received items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {donations.items.map((donation) => (
                    <Link key={donation.id} href={`/app/user/donation`}>
                      <ImageCard
                        image={donation.assets[0].url}
                        title={donation.name}
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
