import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { ROLE_LABELS, can } from "@/lib/roles";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge } from "@/components/admin/ui";
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
        { href: "/app/admin/crm", label: "CRM", show: can(role, "crm.view") },
        { href: "/app/admin/members", label: "Members", show: can(role, "users.view") },
        { href: "/app/admin/listings", label: "Listings", show: can(role, "listings.view") },
        { href: "/app/admin/verifications", label: "Verifications", show: can(role, "verifications.review") },
        { href: "/app/admin/settings", label: "Features", show: can(role, "settings.manage") },
        { href: "/app/admin/roles", label: "Admins", show: can(role, "roles.manage") },
    ].filter((l) => l.show);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-semibold text-ink tracking-tight">Control room</h1>
                <Badge tone="forest">
                    <ShieldCheck className="w-3 h-3" />
                    {ROLE_LABELS[role]}
                </Badge>
            </div>

            <AdminNav links={links} />

            {children}
        </div>
    );
}
