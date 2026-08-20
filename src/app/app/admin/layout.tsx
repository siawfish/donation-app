import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getAttention } from "@/app/app/actions/audit";
import { can } from "@/lib/roles";
import { ADMIN_NAV } from "@/lib/adminNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Single gate for every admin page. Individual actions re-check their own
 * capability server-side — this layout is for navigation and a fast bounce, not
 * the security boundary on its own.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const role = await getMyAdminRole();
    if (!role) redirect("/app");

    const [attention] = await Promise.all([getAttention()]);

    // Hide whole groups a role cannot reach, rather than leaving empty headings.
    const groups = ADMIN_NAV.map((g) => ({
        ...g,
        items: g.items.filter((i) => can(role, i.capability)),
    })).filter((g) => g.items.length > 0);

    return (
        // Negative margins pull the admin shell out of the app container's
        // padding so the sidebar can sit flush against the viewport edge.
        <div className="-mx-4 -my-6 lg:-my-10 flex min-h-[calc(100dvh-4rem)]">
            <AdminSidebar groups={groups} role={role} attention={attention} />
            <div className="flex-1 min-w-0 px-4 py-5 lg:px-6">{children}</div>
        </div>
    );
}
