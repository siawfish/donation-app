"use client";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { usePathname, useRouter } from "next/navigation";

export default function ProfileTabs({
    children
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    return (
        <Tabs defaultValue={pathname}>
            <TabsList className="border-b">
                <TabsTrigger value="/app/donor/my-items" onClick={() => router.push("/app/donor/my-items")}>Listed Items</TabsTrigger>
                <TabsTrigger value="/app/donor/my-donations" onClick={() => router.push("/app/donor/my-donations")}>Donated Items</TabsTrigger>
            </TabsList>
            {children}
        </Tabs>
    )
}