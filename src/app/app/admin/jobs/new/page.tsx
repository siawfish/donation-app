import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { JobEditor } from "@/components/admin/jobs/JobEditor";

export const metadata = { title: "New role — Admin" };

export default async function NewJobPage() {
    const role = await getMyAdminRole();
    if (!can(role, "jobs.manage")) redirect("/app/admin/jobs");
    return <JobEditor />;
}
