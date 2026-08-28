import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { CampaignManager } from "@/components/admin/campaigns/CampaignManager";

export const metadata = { title: "Campaigns — Admin" };

export default async function AdminCampaignsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "crm.manage")) redirect("/app/admin");
    return <CampaignManager />;
}
