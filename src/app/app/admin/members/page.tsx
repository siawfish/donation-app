import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { MembersTable } from "@/components/admin/MembersTable";

export const metadata: Metadata = { title: "Members — Givny admin" };

export default async function MembersPage() {
    const role = await getMyAdminRole();
    if (!can(role, "users.view")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <div>
                <p className="text-[13px] text-gray-500">
                    Suspending blocks someone from using the app. Admins must have their access
                    removed before they can be suspended.
                </p>
            </div>
            <MembersTable canSuspend={can(role, "users.suspend")} />
        </div>
    );
}
