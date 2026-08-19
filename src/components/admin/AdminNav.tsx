"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Underlined tabs rather than pills — the convention operations tools use, and
 * it keeps the active state legible without a filled shape competing with the
 * data below it.
 */
export function AdminNav({ links }: { links: { href: string; label: string }[] }) {
    const pathname = usePathname();

    return (
        <div className="border-b border-gray-200">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
                {links.map((link) => {
                    // "/app/admin" would otherwise match every child route.
                    const active =
                        link.href === "/app/admin" ? pathname === link.href : pathname.startsWith(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex-shrink-0 px-3 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
                                active
                                    ? "border-forest text-forest"
                                    : "border-transparent text-gray-500 hover:text-ink hover:border-gray-300"
                            }`}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
