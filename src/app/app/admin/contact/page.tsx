import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { ContactInbox } from "@/components/admin/contact/ContactInbox";

export const metadata = { title: "Messages — Admin" };

export default async function AdminContactPage() {
    const role = await getMyAdminRole();
    if (!can(role, "contact.manage")) redirect("/app/admin");
    return <ContactInbox />;
}
