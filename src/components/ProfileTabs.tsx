"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Links = [
    {
        label: "Listed Items",
        value: "/app/my-items"
    },
    {
        label: "Donated Items",
        value: "/app/my-donations"
    },
    {
        label: "Pending Requests",
        value: "/app/pending-requests"
    },
    {
        label: "Received Donations",
        value: "/app/donations"
    },
    {
        label: "My Wishlist",
        value: "/app/wishlist"
    }
]

export default function ProfileTabs({
    children
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const isMobile = useIsMobile();
    
    if (isMobile) {
        return (
            <div className="flex flex-col min-h-screen">
                {/* Mobile horizontal tabs */}
                <div className="border-b border-border p-2 sticky top-0 z-10">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                        {Links.map((link) => (
                            <Button
                                key={link.value}
                                className={cn(
                                    "whitespace-nowrap text-xs px-3 py-2 min-w-fit",
                                    pathname === link.value 
                                        ? "bg-primary text-white" 
                                        : "bg-primary-light text-primary hover:bg-accent hover:text-accent-foreground"
                                )}
                                onClick={() => router.push(link.value)}
                            >
                                {link.label}
                            </Button>
                        ))}
                    </div>
                </div>
                
                {/* Main content */}
                <main className="flex-1 p-4">
                    {children}
                </main>
            </div>
        )
    }
    
    return (
        <div className="flex gap-6 min-h-[calc(100vh-150px)] relative">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-card border-r border-border p-4 sticky top-0 bottom-0">
                <nav className="space-y-2">
                    {Links.map((link) => (
                        <Button
                            key={link.value}
                            variant={pathname === link.value ? "default" : "ghost"}
                            className={cn(
                                "w-full justify-start text-left",
                                pathname === link.value 
                                    ? "bg-primary text-white" 
                                    : "hover:bg-accent hover:text-accent-foreground"
                            )}
                            onClick={() => router.push(link.value)}
                        >
                            {link.label}
                        </Button>
                    ))}
                </nav>
            </aside>
            
            {/* Main content */}
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    )
}