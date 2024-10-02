import ImageCard from "./image-card";
import { InfiniteSlider } from "./infinite-slider";

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
    {
      id: 9,
      name: "Daniel Martinez",
      category: "Disaster Relief",
      description: "Donation to help with disaster relief efforts.",
      image: "/placeholder.svg",
    },
    {
      id: 10,
      name: "Sophia Hernandez",
      category: "Animal Shelter",
      description: "Donation to support local animal shelter.",
      image: "/placeholder.svg",
    },
  ];

export function SlidingListings() {
  return (
    <InfiniteSlider className="bg-primary py-12" gap={24} reverse>
        {donations.map((donation) => (
            <ImageCard
                key={donation.id}
                image={donation.image}
                title={donation.name}
                description={donation.description}
                containerClassName="bg-[transparent]"
                titleClassName="text-white"
                descriptionClassName="text-white"
            />
        ))}
    </InfiniteSlider>
  );
}
