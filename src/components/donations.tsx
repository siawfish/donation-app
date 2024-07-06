/**
 * v0 by Vercel.
 * @see https://v0.dev/t/OyjQXXxeeIu
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Donations() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [donationsPerPage] = useState(8);
  const donations = [
    {
      id: 1,
      name: "John Doe",
      category: "Food Bank",
      description: "Donation to support local food bank.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 2,
      name: "Jane Smith",
      category: "Disaster Relief",
      description: "Donation to help with disaster relief efforts.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 3,
      name: "Michael Johnson",
      category: "Education",
      description: "Donation to fund educational scholarships.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 4,
      name: "Emily Davis",
      category: "Animal Rescue",
      description: "Donation to support animal rescue organization.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 5,
      name: "David Wilson",
      category: "Medical Research",
      description: "Donation to help with medical research.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 6,
      name: "Sarah Lee",
      category: "Community Center",
      description: "Donation to support local community center.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 7,
      name: "Tom Brown",
      category: "Environmental Conservation",
      description: "Donation to help with environmental conservation efforts.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 8,
      name: "Olivia Anderson",
      category: "Youth Development",
      description: "Donation to support youth development programs.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 9,
      name: "Daniel Martinez",
      category: "Disaster Relief",
      description: "Donation to help with disaster relief efforts.",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 10,
      name: "Sophia Hernandez",
      category: "Animal Shelter",
      description: "Donation to support local animal shelter.",
      image: "/placeholder.svg?height=200&width=300",
    },
  ];
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Donations</h1>
      <div className="mb-8">
        <Input
          type="text"
          placeholder="Search donations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-white px-4 py-2"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {currentDonations.map((donation) => (
          <Link key={donation.id} href={`/app/requester/donation`}>
            <Card key={donation.id}>
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img
                  src="/placeholder.svg"
                  alt={donation.name}
                  className="object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle>{donation.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-primary font-bold">
                    {donation.category}
                  </span>
                  <Badge variant="secondary">{donation.id}</Badge>
                </div>
                <p className="text-muted-foreground">{donation.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
