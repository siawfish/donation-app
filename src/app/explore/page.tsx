import React from "react";
import { Metadata } from "next";
import Donations from "@/components/Donations";
import { getListings } from "../app/actions/items";
import { getCategories } from "../app/actions/categories";

export const metadata: Metadata = {
  title: "Explore listings",
  description: "Filter and find the perfect listing for you",
};

export default async function Explore({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = searchParams.page ? Number(searchParams.page) : 1;
    const q = searchParams.q as string | undefined;
    const radiusParam = searchParams.radius as string | undefined;
    const maxDistanceKm = radiusParam ? Number(radiusParam) : undefined;

    const [{ data }, categories] = await Promise.all([
        getListings({ page, query: q, maxDistanceKm }),
        getCategories(),
    ]);
    return (
        <Donations categories={categories.data!} donations={data!} />
    );
}
