import { notFound, redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getJobAdmin } from "@/app/app/actions/jobs";
import { can } from "@/lib/roles";
import { JobEditor } from "@/components/admin/jobs/JobEditor";
import { ApplicationPipeline } from "@/components/admin/jobs/ApplicationPipeline";

export const metadata = { title: "Role — Admin" };

export default async function JobDetailPage({ params }: { params: { id: string } }) {
    const role = await getMyAdminRole();
    if (!can(role, "applications.manage")) redirect("/app/admin");

    const res = await getJobAdmin(params.id);
    if (!res.success || !res.data) notFound();

    return (
        <div className="space-y-6">
            <ApplicationPipeline jobId={params.id} canManage={can(role, "applications.manage")} />
            {can(role, "jobs.manage") && <JobEditor job={res.data} />}
        </div>
    );
}
