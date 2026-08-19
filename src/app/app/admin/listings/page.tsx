import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { ListingsTable } from "@/components/admin/ListingsTable";

export const metadata: Metadata = { title: "Listings — Givny admin" };

export default async function AdminListingsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "listings.view")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <div>
                <p className="text-[13px] text-gray-500">
                    Removing a listing also deletes its requests, saves and views so nothing is
                    left pointing at a missing item.
                </p>
            </div>
            <ListingsTable />
        </div>
    );
}
