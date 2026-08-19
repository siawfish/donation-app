"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Links = [
    {
        label: "Up for grabs",
        value: "/app/my-items"
    },
    {
        label: "Passed on",
        value: "/app/my-donations"
    },
    {
        label: "Asked for",
        value: "/app/pending-requests"
    },
    {
        label: "Picked up",
        value: "/app/donations"
    },
    {
        label: "Saved",
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
            <div className="flex flex-col min-h-screen bg-canvas">
                {/* Mobile horizontal tabs */}
                <div className="p-2 sticky top-nav z-10 bg-canvas/95 backdrop-blur-md">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {Links.map((link) => (
                            <button
                                key={link.value}
                                className={cn(
                                    "whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full min-w-fit border transition-colors",
                                    pathname === link.value
                                        ? "bg-forest text-white border-forest"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                )}
                                onClick={() => router.push(link.value)}
                            >
                                {link.label}
                            </button>
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
        <div className="flex gap-8 min-h-[calc(100vh-150px)] relative">
            {/* Desktop Sidebar */}
            <aside className="w-64 p-2 sticky top-20 h-fit">
                <div className="bg-white border border-gray-200/70 rounded-3xl p-3">
                    <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 px-3 pt-2 pb-3">My activity</p>
                    <nav className="space-y-1">
                        {Links.map((link) => (
                            <button
                                key={link.value}
                                className={cn(
                                    "w-full justify-start text-left text-sm font-semibold px-4 py-2.5 rounded-full transition-colors",
                                    pathname === link.value
                                        ? "bg-forest text-white"
                                        : "text-gray-600 hover:bg-sand hover:text-ink"
                                )}
                                onClick={() => router.push(link.value)}
                            >
                                {link.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    )
}
