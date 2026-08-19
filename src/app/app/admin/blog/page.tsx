import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { BlogTable } from "@/components/admin/blog/BlogTable";

export const metadata = { title: "Blog — Admin" };

export default async function AdminBlogPage() {
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) redirect("/app/admin");
    return <BlogTable />;
}
