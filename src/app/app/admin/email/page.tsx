import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { TemplateLibrary } from "@/components/admin/email/TemplateLibrary";

export const metadata = { title: "Email templates — Admin" };

export default async function AdminEmailPage() {
    const role = await getMyAdminRole();
    if (!can(role, "crm.manage")) redirect("/app/admin");
    return <TemplateLibrary />;
}
