"use client";

import Link from "next/link";
import { Home, ListTodo, MessageSquare, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const getIsActive = (pathname: string, href: string) => {
    return pathname === href || 
        (href === '/app/my-items' && 
        (pathname === '/app/my-donations' || pathname === '/app/add-item' || pathname === '/app/pending-requests' || pathname === '/app/donations' || pathname === '/app/wishlist' || pathname.includes('/app/edit-item')))
}

export default function FloatingBottomNavigation() {
    const pathname = usePathname();

    const links = [
        {
            href: "/app",
            icon: Home,
            label: "Dashboard"
        },
        {
            href: "/app/my-items",
            icon: ListTodo,
            label: "Listings"
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
        <div className="fixed bottom-0 left-0 right-0 flex justify-center w-full pb-4">
            <nav className="bg-white border border-gray-200 rounded-full shadow-lg w-full lg:max-w-[400px] animate-slide-up">
                <div className="flex justify-center items-center h-18">
                    {
                        links.map((link) => {
                            const isActive = getIsActive(pathname, link.href)
                            return (
                                <Link 
                                    key={link.href}
                                    href={link.href} 
                                    className={`flex flex-col items-center justify-center w-full py-2 group max-w-[80px] ${pathname === ""}`}
                                >
                                    <span className={`p-1 rounded-md transition-colors duration-200 ease-in-out ${isActive ? 'bg-primary-foreground' : 'group-hover:bg-primary-foreground'}`}>
                                        <link.icon className={`w-6 h-6 transition-colors duration-200 ease-in-out ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} />
                                    </span>
                                    <span className={`text-xs mt-1 transition-colors duration-200 ease-in-out ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>{link.label}</span>
                                </Link>
                            );
                        })
                    }
                </div>
            </nav>
        </div>
    );
}