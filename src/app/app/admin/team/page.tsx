import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { TeamManager } from "@/components/admin/team/TeamManager";

export const metadata = { title: "Team page — Admin" };

export default async function AdminTeamPage() {
    const role = await getMyAdminRole();
    if (!can(role, "team.manage")) redirect("/app/admin");
    return <TeamManager />;
}
