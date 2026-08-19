"use client";

import Link from "next/link";
import { Home, ListTodo, MessageSquare, Settings, Trophy } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

const getIsActive = (pathname: string, href: string) => {
    return pathname === href || 
        (href === '/app/my-items' && 
        (pathname === '/app/my-donations' || pathname === '/app/add-item' || pathname === '/app/pending-requests' || pathname === '/app/donations' || pathname === '/app/wishlist' || pathname.includes('/app/edit-item')))
}

export default function FloatingBottomNavigation() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hide during focused, single-task flows: these own the bottom of the screen
    // with their own action bar, and two stacked bars collide.
    if (pathname === "/app/messages" && searchParams.get("rid")) return null;
    if (pathname === "/app/add-item" || pathname.startsWith("/app/edit-item")) return null;
    // The admin console is a different job with its own navigation, and this bar
    // floats over the bottom rows of every dense table in it.
    if (pathname.startsWith("/app/admin")) return null;

    const links = [
        {
            href: "/app",
            icon: Home,
            label: "Home"
        },
        {
            href: "/app/my-items",
            icon: ListTodo,
            label: "Listings"
        },
        {
            href: "/app/rewards",
            icon: Trophy,
            label: "Rewards"
        },
        {
            href: "/app/messages",
            icon: MessageSquare,
            label: "Messages"
        },
        {
            href: "/app/settings",
            icon: Settings,
            label: "Settings"
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center w-full pb-[calc(1rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))] pointer-events-none">
            <nav className="forest-panel rounded-full shadow-2xl shadow-forest/40 w-full lg:max-w-[420px] animate-slide-up pointer-events-auto">
                <div className="flex justify-center items-center py-1.5 px-2">
                    {
                        links.map((link) => {
                            const isActive = getIsActive(pathname, link.href)
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 group max-w-[90px]"
                                >
                                    <span className={`px-3 sm:px-3.5 py-1 rounded-full transition-all duration-200 ease-in-out ${isActive ? 'bg-lime' : 'group-hover:bg-white/10'}`}>
                                        <link.icon className={`w-5 h-5 transition-colors duration-200 ease-in-out ${isActive ? 'text-forest' : 'text-white/60 group-hover:text-white'}`} />
                                    </span>
                                    <span className={`text-[10px] font-semibold mt-1 whitespace-nowrap transition-colors duration-200 ease-in-out ${isActive ? 'text-lime' : 'text-white/50 group-hover:text-white'}`}>{link.label}</span>
                                </Link>
                            );
                        })
                    }
                </div>
            </nav>
        </div>
    );
}