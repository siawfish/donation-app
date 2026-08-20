import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { AuditLog } from "@/components/admin/AuditLog";

export const metadata = { title: "Audit log — Admin" };

export default async function AuditPage() {
    const role = await getMyAdminRole();
    if (!can(role, "users.view")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <p className="text-[13px] text-gray-500">
                Who did what. Several admin actions cannot be undone, and more than one person can
                take them — this is the record of who did.
            </p>
            <AuditLog />
        </div>
    );
}
