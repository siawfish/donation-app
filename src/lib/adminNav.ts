import type { Capability } from "./roles";

/**
 * Admin navigation, grouped by when you use it rather than when it was built.
 *
 * The organising rule is the badge. Every item that can show a pending count
 * lives in "Today", because those are the only ones where the answer to "is
 * there anything to do?" changes hour to hour — and an admin should get that
 * answer from one glance at one group, not by scanning every heading for a
 * number. Organisations and Ambassadors moved up for exactly that reason;
 * Messages moved out of a group of its own, which was a heading earning its
 * place by holding a single link.
 *
 * Everything below Today is a place you go on purpose: the directories, then
 * what you send out, then what the public reads, then settings you touch
 * monthly. Admins sits in System rather than People — it is a permissions
 * table that happens to contain names.
 */

export interface AdminNavItem {
    href: string;
    label: string;
    capability: Capability;
    /** Which pending counter, if any, belongs on this item. */
    badge?: "verifications" | "applications" | "tasks" | "ambassadors" | "orgs" | "contact";
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
        // Everything somebody is waiting on, in one place. If a badge can
        // appear on an item, the item belongs in this group — an admin who
        // opens the sidebar should be able to see the whole queue without
        // scanning six headings for a number.
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
                href: "/app/admin/contact",
                label: "Messages",
                capability: "contact.manage",
                icon: "Inbox",
                badge: "contact",
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
            { href: "/app/admin/crm", label: "Follow-ups", capability: "crm.view", icon: "ListChecks", badge: "tasks" },
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
        // Who is on the platform, as opposed to what needs doing about them.
        id: "people",
        label: "People",
        items: [
            { href: "/app/admin/members", label: "Members", capability: "users.view", icon: "Users" },
            { href: "/app/admin/listings", label: "Listings", capability: "listings.view", icon: "Package" },
        ],
    },
    {
        // Outbound. Split from People because writing a campaign and looking
        // somebody up are different jobs at different times of the week.
        id: "outreach",
        label: "Outreach",
        items: [
            { href: "/app/admin/campaigns", label: "Campaigns", capability: "crm.manage", icon: "Send" },
            { href: "/app/admin/email", label: "Email templates", capability: "crm.manage", icon: "Mail" },
        ],
    },
    {
        id: "publishing",
        label: "Publishing",
        items: [
            { href: "/app/admin/blog", label: "Journal", capability: "blog.manage", icon: "BookOpen" },
            { href: "/app/admin/blog/comments", label: "Comments", capability: "blog.manage", icon: "MessageSquare" },
            { href: "/app/admin/team", label: "Team page", capability: "team.manage", icon: "IdCard" },
        ],
    },
    {
        id: "system",
        label: "System",
        items: [
            { href: "/app/admin/settings", label: "Features", capability: "settings.manage", icon: "ToggleLeft" },
            { href: "/app/admin/roles", label: "Admins", capability: "roles.manage", icon: "ShieldCheck" },
            { href: "/app/admin/audit", label: "Audit log", capability: "users.view", icon: "ScrollText" },
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
    contact: number;
}

export const EMPTY_ATTENTION: AttentionCounts = {
    verifications: 0,
    applications: 0,
    tasks: 0,
    ambassadors: 0,
    orgs: 0,
    contact: 0,
};
