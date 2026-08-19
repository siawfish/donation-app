"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ links }: { links: { href: string; label: string }[] }) {
    const pathname = usePathname();

    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {links.map((link) => {
                // "/app/admin" would otherwise match every child route.
                const active =
                    link.href === "/app/admin" ? pathname === link.href : pathname.startsWith(link.href);
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                            active
                                ? "bg-forest text-white border-forest"
                                : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                        }`}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </div>
    );
}
