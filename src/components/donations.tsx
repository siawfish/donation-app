"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import ImageCard from "./ui/image-card";

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

export default function Donations() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [donationsPerPage] = useState(8);
  const filteredDonations = donations.filter(
    (donation) =>
      donation.name.toLowerCase().includes(search.toLowerCase()) ||
      donation.description.toLowerCase().includes(search.toLowerCase()) ||
      donation.category.toLowerCase().includes(search.toLowerCase())
  );
  const indexOfLastDonation = currentPage * donationsPerPage;
  const indexOfFirstDonation = indexOfLastDonation - donationsPerPage;
  const currentDonations = filteredDonations.slice(
    indexOfFirstDonation,
    indexOfLastDonation
  );
  const totalPages = Math.ceil(filteredDonations.length / donationsPerPage);
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-row items-center justify-between flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Listings</h1>
          <p className="text-muted-foreground mb-8">
            Find the perfect donation for your cause.
          </p>
        </div>
        <div className="mb-8">
          <Input
            type="text"
            placeholder="Search donations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white px-4 py-2"
          />
        </div>
      </div>
      {/* row of filters, pill buttons */}
      <div className="flex flex-row items-center gap-2 mb-8">
        <button className="bg-primary text-white px-4 py-1 rounded-full text-sm">
          All
        </button>
        <button className="bg-[transparent] border border-primary text-primary px-4 py-1 rounded-full text-sm">
          Food
        </button>
        <button className="bg-[transparent] border border-primary text-primary px-4 py-1 rounded-full text-sm">
          Medical
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {currentDonations.map((donation) => (
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
  );
}
