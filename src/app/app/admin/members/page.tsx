import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { MembersTable } from "@/components/admin/MembersTable";
import { InviteMembers } from "@/components/admin/InviteMembers";

export const metadata: Metadata = { title: "Members — Givny admin" };

export default async function MembersPage() {
    const role = await getMyAdminRole();
    if (!can(role, "users.view")) redirect("/app/admin");

    const canDelete = can(role, "users.delete");

    return (
        <div className="space-y-3">
            <p className="text-[13px] text-gray-500">
                Suspending blocks someone from using the app and can be undone.
                {canDelete && " Deleting removes their account and everything on it, for good."}
                {" "}Admins must have their access removed first, either way.
            </p>

            {can(role, "users.invite") && <InviteMembers />}

            <MembersTable canSuspend={can(role, "users.suspend")} canDelete={canDelete} />
        </div>
    );
}
