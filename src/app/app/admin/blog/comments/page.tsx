import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { CommentsTable } from "@/components/admin/blog/CommentsTable";

export const metadata = { title: "Comments — Admin" };

export default async function AdminCommentsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) redirect("/app/admin");
    return <CommentsTable />;
}
