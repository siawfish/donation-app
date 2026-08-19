import { notFound, redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getPost } from "@/app/app/actions/blog";
import { can } from "@/lib/roles";
import { BlogEditor } from "@/components/admin/blog/BlogEditor";

export const metadata = { title: "Edit post — Admin" };

export default async function EditPostPage({ params }: { params: { id: string } }) {
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) redirect("/app/admin");

    const res = await getPost(params.id);
    if (!res.success || !res.data) notFound();

    return <BlogEditor post={res.data} />;
}
