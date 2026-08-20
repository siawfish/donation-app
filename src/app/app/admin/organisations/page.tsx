import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { OrgQueue } from "@/components/admin/organisations/OrgQueue";

export const metadata = { title: "Organisations — Admin" };

export default async function AdminOrganisationsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "organisations.view")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <p className="text-[13px] text-gray-500">
                Businesses, NGOs and schools listing at scale. Approving one makes its storefront public,
                so check the organisation is real first.
            </p>
            <OrgQueue canManage={can(role, "organisations.manage")} />
        </div>
    );
}
