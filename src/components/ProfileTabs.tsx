"use client";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { usePathname, useRouter } from "next/navigation";

const UserLinks = [
    {
        label: "My Requests",
        value: "/app/user/my-requests"
    },
    {
        label: "Donations",
        value: "/app/user/donations"
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