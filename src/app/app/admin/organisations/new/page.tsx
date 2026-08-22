import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { NewOrgForm } from "@/components/admin/organisations/NewOrgForm";

export const metadata = { title: "New organisation — Admin" };

export default async function NewOrganisationPage() {
    const role = await getMyAdminRole();
    if (!can(role, "organisations.manage")) redirect("/app/admin");
    return <NewOrgForm />;
}
