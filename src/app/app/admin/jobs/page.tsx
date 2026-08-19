import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { JobsTable } from "@/components/admin/jobs/JobsTable";
import { ApplicationPipeline } from "@/components/admin/jobs/ApplicationPipeline";

export const metadata = { title: "Jobs — Admin" };

export default async function AdminJobsPage() {
    const role = await getMyAdminRole();
    if (!can(role, "applications.manage")) redirect("/app/admin");

    return (
        <div className="space-y-4">
            <JobsTable canManageJobs={can(role, "jobs.manage")} />
            {/* Every applicant across every role — the queue you work from
                daily, rather than clicking into each posting. */}
            <ApplicationPipeline canManage={can(role, "applications.manage")} />
        </div>
    );
}
