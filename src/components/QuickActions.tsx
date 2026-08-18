import React from "react";
import { PackagePlus, Search, Heart, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const actions = [
    {
        href: "/app/add-item",
        icon: PackagePlus,
        label: "List an item",
        blurb: "Photo, description, pin — under two minutes.",
        primary: true,
    },
    {
        href: "/explore",
        icon: Search,
        label: "Browse nearby",
        blurb: "Free items from neighbours, closest first.",
    },
    {
        href: "/app/wishlist",
        icon: Heart,
        label: "Your wishlist",
        blurb: "Everything you've saved for later.",
    },
];

export function QuickActions() {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Quick actions</p>
                <h2 className="text-xl font-bold text-ink tracking-tight">What would you like to do?</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {actions.map(({ href, icon: Icon, label, blurb, primary }) => (
                    <Link key={href} href={href} className="group">
                        <div
                            className={`card-hover h-full rounded-3xl p-5 flex items-start gap-4 sm:flex-col sm:gap-0 ${
                                primary
                                    ? "forest-panel text-white"
                                    : "bg-white border border-gray-200/70 group-hover:border-forest/30"
                            }`}
                        >
                            <span
                                className={`flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 sm:mb-5 transition-transform group-hover:scale-110 ${
                                    primary ? "bg-lime text-forest" : "bg-primary-light text-primary"
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-sm font-bold ${primary ? "text-white" : "text-ink"}`}>
                                        {label}
                                    </span>
                                    <ArrowUpRight
                                        className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all ${
                                            primary ? "text-lime" : "text-forest"
                                        }`}
                                    />
                                </div>
                                <p className={`text-xs mt-1 leading-relaxed ${primary ? "text-white/60" : "text-gray-400"}`}>
                                    {blurb}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
