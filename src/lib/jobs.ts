/**
 * Job portal model.
 *
 * Applications move through an explicit pipeline. The stage list is ordered and
 * closed rather than free text, because the whole point of tracking is being
 * able to ask "how many are at interview" and get the same answer every time.
 */

export type JobStatus = "draft" | "open" | "closed";

export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "volunteer";

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
    full_time: "Full time",
    part_time: "Part time",
    contract: "Contract",
    internship: "Internship",
    volunteer: "Volunteer",
};

export type WorkMode = "onsite" | "hybrid" | "remote";

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
    onsite: "On site",
    hybrid: "Hybrid",
    remote: "Remote",
};

export interface Job {
    id?: string;
    title: string;
    slug: string;
    department?: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    /** Markdown, same renderer as the blog. */
    description: string;
    /** One per line in the editor, stored as a list. */
    responsibilities: string[];
    requirements: string[];
    salaryRange?: string;
    status: JobStatus;
    /** Applications are refused after this date even while the post is open. */
    closesOn?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface JobListItem {
    id: string;
    title: string;
    slug: string;
    department?: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    status: JobStatus;
    closesOn?: string;
    createdAt: string;
    applicationCount: number;
    newCount: number;
}

/* ── Pipeline ──────────────────────────────────────────────────────────── */

export type ApplicationStage =
    | "new"
    | "screening"
    | "interview"
    | "offer"
    | "hired"
    | "rejected"
    | "withdrawn";

/** Ordered; `terminal` stages end the process and are excluded from the funnel. */
export const STAGES: {
    id: ApplicationStage;
    label: string;
    tone: "neutral" | "info" | "warn" | "good" | "bad";
    terminal?: boolean;
}[] = [
    { id: "new", label: "New", tone: "info" },
    { id: "screening", label: "Screening", tone: "neutral" },
    { id: "interview", label: "Interview", tone: "warn" },
    { id: "offer", label: "Offer", tone: "warn" },
    { id: "hired", label: "Hired", tone: "good", terminal: true },
    { id: "rejected", label: "Rejected", tone: "bad", terminal: true },
    { id: "withdrawn", label: "Withdrawn", tone: "neutral", terminal: true },
];

export const STAGE_LABELS = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<
    ApplicationStage,
    string
>;

export const ACTIVE_STAGES: ApplicationStage[] = STAGES.filter((s) => !s.terminal).map((s) => s.id);

export function isTerminalStage(stage: ApplicationStage): boolean {
    return STAGES.find((s) => s.id === stage)?.terminal === true;
}

export interface JobApplication {
    id?: string;
    jobId: string;
    /** Denormalised so the pipeline doesn't need a read per row. */
    jobTitle?: string;
    name: string;
    email: string;
    phone?: string;
    coverNote?: string;
    /** Storage path, never a public URL — CVs are read through signed URLs. */
    resumePath?: string;
    resumeName?: string;
    stage: ApplicationStage;
    rating?: number;
    createdAt: string;
    updatedAt: string;
    /** Append-only trail of who moved it where. */
    history: { stage: ApplicationStage; at: string; by: string; byName?: string; note?: string }[];
}

/* ── Validation ────────────────────────────────────────────────────────── */

export function slugifyJob(input: string): string {
    return (input ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

export function isValidEmail(email: string): boolean {
    // Deliberately loose: the only real test of an address is sending to it,
    // and over-strict patterns reject valid addresses.
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Ghanaian mobile numbers, local or international form. Optional field. */
export function isValidPhone(phone: string): boolean {
    const digits = phone.replace(/[\s-()]/g, "");
    return /^(\+233|0)\d{9}$/.test(digits);
}

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function isAcceptedResume(file: { type: string; size: number }): boolean {
    return RESUME_TYPES.includes(file.type) && file.size > 0 && file.size <= RESUME_MAX_BYTES;
}

/** Open, published, and not past its closing date. */
export function isAcceptingApplications(job: Pick<Job, "status" | "closesOn">, now = new Date()): boolean {
    if (job.status !== "open") return false;
    if (!job.closesOn) return true;
    // Compare on date only, so a job closing today still accepts today.
    const close = new Date(`${job.closesOn}T23:59:59`);
    return !Number.isNaN(close.getTime()) && close.getTime() >= now.getTime();
}

/** Counts per stage, for the pipeline header. */
export function stageCounts(applications: { stage: ApplicationStage }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s.id] = 0));
    applications.forEach((a) => (counts[a.stage] = (counts[a.stage] ?? 0) + 1));
    return counts;
}
