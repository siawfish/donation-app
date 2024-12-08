"use client";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { usePathname, useRouter } from "next/navigation";

const UserLinks = [
    {
        label: "Pending Requests",
        value: "/app/user/pending-requests"
    },
    {
        label: "Received Donations",
        value: "/app/user/donations"
    },
    {
        label: "My Wishlist",
        value: "/app/user/wishlist"
    }
]

const DonorLinks = [
    {
        label: "Listed Items",
        value: "/app/donor/my-items"
    },
    {
        label: "Donated Items",
        value: "/app/donor/my-donations"
    }
]

export default function ProfileTabs({
    children
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const links = pathname.includes("donor") ? DonorLinks : UserLinks;
    return (
        <Tabs defaultValue={pathname}>
            <TabsList className="border-b">
                {links.map((link) => (
                    <TabsTrigger key={link.value} value={link.value} onClick={() => router.push(link.value)}>{link.label}</TabsTrigger>
                ))}
            </TabsList>
            {children}
        </Tabs>
    )
}