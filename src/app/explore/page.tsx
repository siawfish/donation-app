import React from "react";
import { Metadata } from "next";
import Donations from "@/components/Donations";
import { getListings } from "../app/actions/items";
import { getCategories } from "../app/actions/categories";

export const metadata: Metadata = {
  title: "Browse what's nearby — Givny",
  description:
    "Free items from neighbours near you, sorted by distance. Find something you need and give it a second life.",
};

// Route files may only export Next's reserved names, so this stays local.
const PAGE_SIZE = 12;

export default async function Explore({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
    const cid = typeof searchParams.cid === "string" ? searchParams.cid : undefined;
    const radius = typeof searchParams.radius === "string" ? searchParams.radius : undefined;
    const maxDistanceKm = radius ? Number(radius) : undefined;

    const [{ data }, categories] = await Promise.all([
        getListings({
            page: 1,
            limit: PAGE_SIZE,
            query: q,
            categoryId: cid,
            maxDistanceKm,
        }),
        getCategories(),
    ]);

    return (
        <Donations
            categories={categories.data ?? []}
            initial={data ?? { items: [], total: 0, page: 1, limit: PAGE_SIZE }}
            loadListings={getListings}
        />
    );
}
