"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createJob, updateJob, type JobInput } from "@/app/app/actions/jobs";
import {
    EMPLOYMENT_LABELS, EmploymentType, Job, JobStatus, WORK_MODE_LABELS, WorkMode, slugifyJob,
} from "@/lib/jobs";
import { Badge, Button, Input, Panel, Select, Textarea } from "../ui";

const EMPTY: JobInput = {
    title: "", slug: "", department: "", location: "Accra, Ghana",
    workMode: "hybrid", employmentType: "full_time",
    description: "", responsibilities: [], requirements: [],
    salaryRange: "", status: "draft", closesOn: "",
};

/** One item per line, which is how people naturally type a list. */
const toLines = (xs: string[]) => (xs ?? []).join("\n");
const fromLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function JobEditor({ job }: { job?: Job }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [slugTouched, setSlugTouched] = useState(!!job?.slug);

    const [form, setForm] = useState<JobInput>(
        job
            ? {
                  title: job.title, slug: job.slug, department: job.department ?? "",
                  location: job.location, workMode: job.workMode, employmentType: job.employmentType,
                  description: job.description, responsibilities: job.responsibilities ?? [],
                  requirements: job.requirements ?? [], salaryRange: job.salaryRange ?? "",
                  status: job.status, closesOn: job.closesOn ?? "",
              }
            : EMPTY
    );

    const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setForm((f) => ({ ...f, [k]: v }));

    const save = (status: JobStatus) => {
        startTransition(async () => {
            const payload = { ...form, status };
            const res = job?.id ? await updateJob(job.id, payload) : await createJob(payload);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            if (!job?.id && res.data) router.push(`/app/admin/jobs/${res.data}`);
            else router.refresh();
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Link href="/app/admin/jobs" className="text-xs font-semibold text-gray-500 hover:text-forest">
                        ← All roles
                    </Link>
                    {job && (
                        <Badge tone={job.status === "open" ? "good" : "neutral"}>
                            {job.status === "open" ? "Open" : job.status === "draft" ? "Draft" : "Closed"}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {job?.status === "open" && (
                        <Link href={`/careers/${job.slug}`} target="_blank">
                            <Button><ExternalLink className="w-3.5 h-3.5" /> View</Button>
                        </Link>
                    )}
                    <Button onClick={() => save("draft")} disabled={pending}>
                        <Save className="w-3.5 h-3.5" /> Save draft
                    </Button>
                    {job?.status === "open" && (
                        <Button onClick={() => save("closed")} disabled={pending}>Close role</Button>
                    )}
                    <Button variant="primary" onClick={() => save("open")} disabled={pending}>
                        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {job?.status === "open" ? "Update" : "Publish"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
                <div className="space-y-4 min-w-0">
                    <Panel title="The role">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Title</label>
                        <Input
                            value={form.title}
                            onChange={(e) => {
                                const title = e.target.value;
                                setForm((f) => ({ ...f, title, ...(slugTouched ? {} : { slug: slugifyJob(title) }) }));
                            }}
                            placeholder="Community Operations Lead"
                            className="w-full mt-1"
                        />

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">URL</label>
                        <Input
                            value={form.slug}
                            onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                            placeholder="community-operations-lead"
                            className="w-full mt-1"
                        />

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">
                            Description <span className="normal-case tracking-normal font-normal text-gray-400">— markdown</span>
                        </label>
                        <Textarea
                            rows={10}
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            placeholder={"What the role is, who it's for, and why it matters.\n\nMarkdown works here."}
                            className="mt-1 font-mono text-[13px]"
                        />
                    </Panel>

                    <Panel title="What they'll do" description="One per line.">
                        <Textarea
                            rows={6}
                            value={toLines(form.responsibilities)}
                            onChange={(e) => set("responsibilities", fromLines(e.target.value))}
                            placeholder={"Run weekly community sessions\nTriage reported listings\nOwn the handover experience"}
                        />
                    </Panel>

                    <Panel title="What we're looking for" description="One per line.">
                        <Textarea
                            rows={6}
                            value={toLines(form.requirements)}
                            onChange={(e) => set("requirements", fromLines(e.target.value))}
                            placeholder={"Two years in operations or community work\nComfortable in Twi and English\nBased in Greater Accra"}
                        />
                    </Panel>
                </div>

                <div className="space-y-4 min-w-0">
                    <Panel title="Details">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Department</label>
                        <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Operations" className="w-full mt-1" />

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Location</label>
                        <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Accra, Ghana" className="w-full mt-1" />

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Employment type</label>
                        <Select value={form.employmentType} onChange={(e) => set("employmentType", e.target.value as EmploymentType)} className="w-full mt-1">
                            {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Work mode</label>
                        <Select value={form.workMode} onChange={(e) => set("workMode", e.target.value as WorkMode)} className="w-full mt-1">
                            {Object.entries(WORK_MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Salary range</label>
                        <Input value={form.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} placeholder="GHS 4,000 – 6,000 / month" className="w-full mt-1" />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Optional, but roles that state pay get markedly more applicants.
                        </p>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">Closing date</label>
                        <Input type="date" value={form.closesOn} onChange={(e) => set("closesOn", e.target.value)} className="w-full mt-1" />
                        <p className="text-[11px] text-gray-400 mt-1">
                            After this the role stays visible but stops accepting applications.
                        </p>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
