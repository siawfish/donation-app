import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getCrmMember, listAssignees } from "@/app/app/actions/crm";
import { can } from "@/lib/roles";
import { MemberWorkspace } from "@/components/admin/crm/MemberWorkspace";

export const metadata = { title: "Member — CRM" };

export default async function CrmMemberPage({ params }: { params: { uid: string } }) {
    const role = await getMyAdminRole();
    if (!can(role, "crm.view")) redirect("/app/admin");

    const [detail, assignees] = await Promise.all([getCrmMember(params.uid), listAssignees()]);
    if (!detail.success || !detail.data?.member) notFound();

    return (
        <div className="space-y-3">
            <Link
                href="/app/admin/crm"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-forest transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" /> All members
            </Link>

            <MemberWorkspace
                uid={params.uid}
                initial={detail.data}
                canManage={can(role, "crm.manage")}
                assignees={assignees.data}
            />
        </div>
    );
}
