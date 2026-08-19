import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { CrmDirectory } from "@/components/admin/crm/CrmDirectory";
import { TaskQueue } from "@/components/admin/crm/TaskQueue";

export const metadata = { title: "CRM — Admin" };

export default async function CrmPage() {
    const role = await getMyAdminRole();
    if (!can(role, "crm.view")) redirect("/app/admin");

    return (
        <div className="space-y-4">
            {/* Follow-ups lead: they are the only thing on this screen that is
                owed to someone by a date. */}
            <TaskQueue canManage={can(role, "crm.manage")} />
            <CrmDirectory />
        </div>
    );
}
