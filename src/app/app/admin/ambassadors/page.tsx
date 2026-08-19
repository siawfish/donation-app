import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { AmbassadorRoster } from "@/components/admin/ambassadors/AmbassadorRoster";

export const metadata = { title: "Ambassadors — Admin" };

export default async function AmbassadorsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "ambassadors.view")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <p className="text-[13px] text-gray-500">
                Signups are attributed automatically through each ambassador&rsquo;s referral link, so these
                numbers are measured rather than reported.
            </p>
            <AmbassadorRoster canManage={can(role, "ambassadors.manage")} />
        </div>
    );
}
