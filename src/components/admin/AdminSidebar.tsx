"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, BadgeCheck, Briefcase, Contact, Users, Megaphone, Package,
    BookOpen, ToggleLeft, ScrollText, ShieldCheck, PanelLeftClose, PanelLeftOpen, Building2,
    Menu, X, ArrowLeft,
} from "lucide-react";
import { AdminNavGroup, AttentionCounts } from "@/lib/adminNav";
import { ROLE_LABELS, type AdminRole } from "@/lib/roles";

const ICONS: Record<string, typeof Users> = {
    LayoutDashboard, BadgeCheck, Briefcase, Contact, Users, Megaphone, Package,
    BookOpen, ToggleLeft, ScrollText, ShieldCheck, Building2,
};

const STORAGE_KEY = "givny.admin.sidebar";

export function AdminSidebar({
    groups,
    role,
    attention,
}: {
    groups: AdminNavGroup[];
    role: AdminRole;
    attention: AttentionCounts;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    // Read after mount: touching localStorage during render would desync the
    // server HTML from the first client paint.
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
        setReady(true);
    }, []);

    useEffect(() => {
        if (ready) localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }, [collapsed, ready]);

    // A route change should close the drawer; leaving it open over the page you
    // just navigated to is the most common mobile nav bug.
    useEffect(() => { setMobileOpen(false) }, [pathname]);

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    const nav = (
        <nav className="flex flex-col gap-4 py-3">
            {groups.map((group) => (
                <div key={group.id}>
                    {!collapsed && (
                        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                            {group.label}
                        </p>
                    )}
                    <ul className="space-y-0.5">
                        {group.items.map((item) => {
                            const Icon = ICONS[item.icon] ?? Package;
                            const active = isActive(item.href, item.exact);
                            const count = item.badge ? attention[item.badge] : 0;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        title={collapsed ? item.label : undefined}
                                        aria-current={active ? "page" : undefined}
                                        className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                                            active
                                                ? "bg-forest text-white"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-ink"
                                        } ${collapsed ? "justify-center px-0" : ""}`}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}

                                        {count > 0 && (
                                            <span
                                                className={
                                                    collapsed
                                                        ? "absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-500"
                                                        : `inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums ${
                                                              active ? "bg-lime text-forest" : "bg-amber-100 text-amber-700"
                                                          }`
                                                }
                                            >
                                                {collapsed ? "" : count}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );

    return (
        <>
            {/* Mobile trigger. The sidebar itself is off-canvas below lg. */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
                <Menu className="w-3.5 h-3.5" /> Menu
            </button>

            {/* Desktop rail */}
            <aside
                className={`hidden lg:flex flex-col flex-shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 ${
                    collapsed ? "w-[60px]" : "w-[208px]"
                }`}
            >
                <div className={`flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 ${collapsed ? "justify-center" : "justify-between"}`}>
                    {!collapsed && (
                        <span className="text-[13px] font-semibold text-ink truncate">Control room</span>
                    )}
                    <button
                        onClick={() => setCollapsed((v) => !v)}
                        title={collapsed ? "Expand menu" : "Collapse menu"}
                        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                        className="text-gray-400 hover:text-ink transition-colors"
                    >
                        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2">{nav}</div>

                <div className="border-t border-gray-200 px-2 py-2 space-y-1">
                    {!collapsed && (
                        <p className="px-1 text-[10px] text-gray-400">
                            Signed in as <span className="font-semibold text-gray-600">{ROLE_LABELS[role]}</span>
                        </p>
                    )}
                    {/* Getting back out of the admin area was otherwise a
                        browser-back job. */}
                    <Link
                        href="/app"
                        title={collapsed ? "Back to app" : undefined}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 hover:text-ink transition-colors ${
                            collapsed ? "justify-center px-0" : ""
                        }`}
                    >
                        <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && "Back to app"}
                    </Link>
                </div>
            </aside>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <button
                        aria-label="Close menu"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-black/40"
                    />
                    <aside className="relative w-[240px] max-w-[80vw] bg-white border-r border-gray-200 flex flex-col animate-slide-in-left pt-safe">
                        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
                            <span className="text-[13px] font-semibold text-ink">Control room</span>
                            <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2">{nav}</div>
                        <div className="border-t border-gray-200 px-2 py-2 pb-[calc(0.5rem+var(--safe-bottom))]">
                            <Link href="/app" className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100">
                                <ArrowLeft className="w-4 h-4" /> Back to app
                            </Link>
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}
