import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { ROLE_LABELS, can } from "@/lib/roles";
import { AdminNav } from "@/components/admin/AdminNav";
import { ShieldCheck } from "lucide-react";

/**
 * Single gate for every admin page. Individual actions re-check their own
 * capability server-side — this layout is for navigation and a fast bounce, not
 * the security boundary on its own.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const role = await getMyAdminRole();
    if (!role) redirect("/app");

    const links = [
        { href: "/app/admin", label: "Overview", show: can(role, "analytics.view") },
        { href: "/app/admin/members", label: "Members", show: can(role, "users.view") },
        { href: "/app/admin/listings", label: "Listings", show: can(role, "listings.view") },
        { href: "/app/admin/verifications", label: "Verifications", show: can(role, "verifications.review") },
        { href: "/app/admin/roles", label: "Admins", show: can(role, "roles.manage") },
    ].filter((l) => l.show);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Admin</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Control room</h1>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-forest text-lime text-xs font-bold px-3.5 py-2 rounded-full flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {ROLE_LABELS[role]}
                </span>
            </div>

            <AdminNav links={links} />

            {children}
        </div>
    );
}
