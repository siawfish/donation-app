import type { Capability } from "./roles";

/**
 * Admin navigation, grouped by when you use it rather than when it was built.
 *
 * The previous order was the order features landed, which meant Verifications —
 * a queue somebody is waiting in — sat between Listings and Blog. These groups
 * follow the working day instead: what needs you now, then the people, then the
 * things they post, then what the public sees, then settings you touch monthly.
 */

export interface AdminNavItem {
    href: string;
    label: string;
    capability: Capability;
    /** Which pending counter, if any, belongs on this item. */
    badge?: "verifications" | "applications" | "tasks" | "ambassadors" | "orgs";
    /** Icon name resolved in the sidebar, so this file stays free of JSX. */
    icon: string;
    /** Marks the section landing page, which must match exactly. */
    exact?: boolean;
}

export interface AdminNavGroup {
    id: string;
    label: string;
    items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
    {
        id: "today",
        label: "Today",
        items: [
            {
                href: "/app/admin",
                label: "Overview",
                capability: "analytics.view",
                icon: "LayoutDashboard",
                exact: true,
            },
            {
                href: "/app/admin/verifications",
                label: "Verifications",
                capability: "verifications.review",
                icon: "BadgeCheck",
                badge: "verifications",
            },
            {
                href: "/app/admin/jobs",
                label: "Applications",
                capability: "applications.manage",
                icon: "Briefcase",
                badge: "applications",
            },
        ],
    },
    {
        id: "people",
        label: "People",
        items: [
            { href: "/app/admin/crm", label: "CRM", capability: "crm.view", icon: "Contact", badge: "tasks" },
            { href: "/app/admin/members", label: "Members", capability: "users.view", icon: "Users" },
            {
                href: "/app/admin/organisations",
                label: "Organisations",
                capability: "organisations.view",
                icon: "Building2",
                badge: "orgs",
            },
            {
                href: "/app/admin/ambassadors",
                label: "Ambassadors",
                capability: "ambassadors.view",
                icon: "Megaphone",
                badge: "ambassadors",
            },
        ],
    },
    {
        id: "marketplace",
        label: "Marketplace",
        items: [
            { href: "/app/admin/listings", label: "Listings", capability: "listings.view", icon: "Package" },
        ],
    },
    {
        id: "publishing",
        label: "Publishing",
        items: [
            { href: "/app/admin/blog", label: "Journal", capability: "blog.manage", icon: "BookOpen" },
        ],
    },
    {
        id: "system",
        label: "System",
        items: [
            { href: "/app/admin/settings", label: "Features", capability: "settings.manage", icon: "ToggleLeft" },
            { href: "/app/admin/audit", label: "Audit log", capability: "users.view", icon: "ScrollText" },
            { href: "/app/admin/roles", label: "Admins", capability: "roles.manage", icon: "ShieldCheck" },
        ],
    },
];

/** Counts shown as badges beside the items that own them. */
export interface AttentionCounts {
    verifications: number;
    applications: number;
    tasks: number;
    ambassadors: number;
    orgs: number;
}

export const EMPTY_ATTENTION: AttentionCounts = {
    verifications: 0,
    applications: 0,
    tasks: 0,
    ambassadors: 0,
    orgs: 0,
};
