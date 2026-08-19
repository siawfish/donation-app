import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { BlogEditor } from "@/components/admin/blog/BlogEditor";

export const metadata = { title: "New post — Admin" };

export default async function NewPostPage() {
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) redirect("/app/admin");
    return <BlogEditor />;
}
