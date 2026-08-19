'use server';

import { cache } from "react";
import { db, getFirebaseAdminApp } from "@/firebase/init";
import { getStorage } from "firebase-admin/storage";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import {
    ApplicationStage, EmploymentType, Job, JobApplication, JobListItem, JobStatus, WorkMode,
    isAcceptingApplications, isValidEmail, isValidPhone, slugifyJob,
} from "@/lib/jobs";

const JOBS = "jobs";
const APPLICATIONS = "jobApplications";

async function requireJobsAdmin(capability: "jobs.manage" | "applications.manage" = "jobs.manage") {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, capability)) throw new Error("You don't have permission to do that.");
    return { uid: tokens.decodedToken.uid };
}

async function actorName(uid: string): Promise<string> {
    const snap = await db.collection("users").doc(uid).get();
    return (snap.data()?.name as string) || "Admin";
}

const iso = () => new Date().toISOString();

/* ── Public ────────────────────────────────────────────────────────────── */

const readOpenJobs = cache(async (): Promise<Job[]> => {
    try {
        const snap = await db.collection(JOBS).where("status", "==", "open").get();
        const rows = snap.docs.map((d) => ({ ...(d.data() as Job), id: d.id }));
        // A job past its closing date stays visible but stops accepting; the
        // page says so rather than pretending the role never existed.
        rows.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
        return rows;
    } catch {
        return [];
    }
});

export async function listOpenJobs(): Promise<Job[]> {
    return readOpenJobs();
}

export async function getOpenJob(slug: string): Promise<Job | null> {
    try {
        const snap = await db.collection(JOBS).where("slug", "==", slug).limit(1).get();
        if (snap.empty) return null;
        const job = { ...(snap.docs[0].data() as Job), id: snap.docs[0].id };
        return job.status === "open" ? job : null;
    } catch {
        return null;
    }
}

/**
 * Submit an application.
 *
 * Open to anyone, signed in or not — requiring an account to apply for a job
 * would cost real candidates. The resume is uploaded client-side to a path this
 * action verifies, and only the storage path is stored.
 */
export async function submitApplication(input: {
    jobId: string;
    name: string;
    email: string;
    phone?: string;
    coverNote?: string;
    resumePath?: string;
    resumeName?: string;
}): Promise<ResponseData<null>> {
    try {
        const name = input.name?.trim();
        const email = input.email?.trim().toLowerCase();

        if (!name || name.length < 2) throw new Error("Please give your full name.");
        if (!isValidEmail(email ?? "")) throw new Error("That email address doesn't look right.");
        if (input.phone?.trim() && !isValidPhone(input.phone)) {
            throw new Error("That phone number doesn't look like a Ghanaian number.");
        }
        if ((input.coverNote?.length ?? 0) > 4000) throw new Error("That cover note is too long.");

        const jobSnap = await db.collection(JOBS).doc(input.jobId).get();
        if (!jobSnap.exists) throw new Error("That role no longer exists.");
        const job = jobSnap.data() as Job;
        if (!isAcceptingApplications(job)) throw new Error("This role is no longer accepting applications.");

        // One application per person per role, so the pipeline isn't full of
        // duplicates from an impatient refresh.
        const existing = await db
            .collection(APPLICATIONS)
            .where("jobId", "==", input.jobId)
            .where("email", "==", email)
            .limit(1)
            .get();
        if (!existing.empty) throw new Error("You've already applied for this role.");

        // The path must belong to this job, so a crafted request can't attach a
        // file from somewhere else in the bucket.
        const resumePath = input.resumePath?.trim();
        if (resumePath && !resumePath.startsWith(`resumes/${input.jobId}/`)) {
            throw new Error("That attachment isn't valid.");
        }

        const now = iso();
        await db.collection(APPLICATIONS).add({
            jobId: input.jobId,
            jobTitle: job.title,
            name,
            email,
            phone: input.phone?.trim() ?? "",
            coverNote: input.coverNote?.trim() ?? "",
            resumePath: resumePath ?? "",
            resumeName: input.resumeName?.trim() ?? "",
            stage: "new",
            createdAt: now,
            updatedAt: now,
            history: [{ stage: "new", at: now, by: "applicant", byName: name }],
        });

        revalidatePath("/app/admin/jobs");
        return { success: true, message: "Application received", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Admin: jobs ───────────────────────────────────────────────────────── */

export interface JobInput {
    title: string;
    slug?: string;
    department?: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    description: string;
    responsibilities: string[];
    requirements: string[];
    salaryRange?: string;
    status: JobStatus;
    closesOn?: string;
}

function cleanJob(input: JobInput) {
    const title = input.title?.trim();
    if (!title) throw new Error("Give the role a title.");
    if (!input.location?.trim()) throw new Error("Add a location.");
    if (!input.description?.trim()) throw new Error("Add a description.");

    const slug = slugifyJob(input.slug?.trim() || title);
    if (slug.length < 3) throw new Error("That slug isn't usable.");
    if (input.closesOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.closesOn)) {
        throw new Error("That closing date isn't valid.");
    }

    const list = (xs: string[]) => (xs ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 25);

    return {
        title,
        slug,
        department: input.department?.trim() ?? "",
        location: input.location.trim(),
        workMode: input.workMode,
        employmentType: input.employmentType,
        description: input.description,
        responsibilities: list(input.responsibilities),
        requirements: list(input.requirements),
        salaryRange: input.salaryRange?.trim() ?? "",
        status: input.status,
        closesOn: input.closesOn ?? "",
    };
}

async function assertJobSlugFree(slug: string, exceptId?: string) {
    const snap = await db.collection(JOBS).where("slug", "==", slug).get();
    if (snap.docs.some((d) => d.id !== exceptId)) {
        throw new Error(`The slug "${slug}" is already used by another role.`);
    }
}

function revalidateJobs(slug?: string) {
    revalidatePath("/careers");
    revalidatePath("/sitemap.xml");
    revalidatePath("/app/admin/jobs");
    if (slug) revalidatePath(`/careers/${slug}`);
}

export async function createJob(input: JobInput): Promise<ResponseData<string | null>> {
    try {
        const { uid } = await requireJobsAdmin();
        const data = cleanJob(input);
        await assertJobSlugFree(data.slug);

        const now = iso();
        const ref = await db.collection(JOBS).add({
            ...data,
            createdBy: uid,
            createdAt: now,
            updatedAt: now,
            ...(data.status === "open" ? { publishedAt: now } : {}),
        });

        revalidateJobs(data.slug);
        return { success: true, message: "Role created", data: ref.id };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function updateJob(id: string, input: JobInput): Promise<ResponseData<null>> {
    try {
        await requireJobsAdmin();
        const data = cleanJob(input);
        await assertJobSlugFree(data.slug, id);

        const snap = await db.collection(JOBS).doc(id).get();
        if (!snap.exists) throw new Error("Role not found");
        const prev = snap.data() as Job;

        await db.collection(JOBS).doc(id).update({
            ...data,
            updatedAt: iso(),
            ...(data.status === "open" && !prev.publishedAt ? { publishedAt: iso() } : {}),
        });

        revalidateJobs(data.slug);
        if (prev.slug !== data.slug) revalidateJobs(prev.slug);
        return { success: true, message: "Role saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteJob(id: string): Promise<ResponseData<null>> {
    try {
        await requireJobsAdmin();
        const apps = await db.collection(APPLICATIONS).where("jobId", "==", id).get();
        if (!apps.empty) {
            throw new Error(
                `This role has ${apps.size} application${apps.size === 1 ? "" : "s"}. Close it instead of deleting, so the records survive.`
            );
        }
        const snap = await db.collection(JOBS).doc(id).get();
        await db.collection(JOBS).doc(id).delete();
        revalidateJobs((snap.data() as Job | undefined)?.slug);
        return { success: true, message: "Role deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function listJobsAdmin(): Promise<ResponseData<JobListItem[]>> {
    try {
        await requireJobsAdmin("applications.manage");
        const [jobsSnap, appsSnap] = await Promise.all([
            db.collection(JOBS).get(),
            db.collection(APPLICATIONS).get(),
        ]);

        const total = new Map<string, number>();
        const fresh = new Map<string, number>();
        appsSnap.docs.forEach((d) => {
            const v = d.data();
            total.set(v.jobId, (total.get(v.jobId) ?? 0) + 1);
            if (v.stage === "new") fresh.set(v.jobId, (fresh.get(v.jobId) ?? 0) + 1);
        });

        const rows: JobListItem[] = jobsSnap.docs.map((d) => {
            const v = d.data() as Job;
            return {
                id: d.id,
                title: v.title,
                slug: v.slug,
                department: v.department,
                location: v.location,
                workMode: v.workMode,
                employmentType: v.employmentType,
                status: v.status,
                closesOn: v.closesOn,
                createdAt: v.createdAt,
                applicationCount: total.get(d.id) ?? 0,
                newCount: fresh.get(d.id) ?? 0,
            };
        });
        rows.sort((a, b) => b.newCount - a.newCount || b.createdAt.localeCompare(a.createdAt));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function getJobAdmin(id: string): Promise<ResponseData<Job | null>> {
    try {
        await requireJobsAdmin("applications.manage");
        const snap = await db.collection(JOBS).doc(id).get();
        if (!snap.exists) return { success: false, message: "Role not found", data: null };
        return { success: true, message: "ok", data: { ...(snap.data() as Job), id: snap.id } };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Admin: applications ───────────────────────────────────────────────── */

export async function listApplications(jobId?: string): Promise<ResponseData<JobApplication[]>> {
    try {
        await requireJobsAdmin("applications.manage");
        const q = jobId
            ? db.collection(APPLICATIONS).where("jobId", "==", jobId)
            : db.collection(APPLICATIONS);
        const snap = await q.get();
        const rows = snap.docs.map((d) => ({ ...(d.data() as JobApplication), id: d.id }));
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function setApplicationStage({
    id,
    stage,
    note,
}: { id: string; stage: ApplicationStage; note?: string }): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireJobsAdmin("applications.manage");
        const ref = db.collection(APPLICATIONS).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Application not found");
        const prev = snap.data() as JobApplication;
        if (prev.stage === stage) return { success: true, message: "Already there", data: null };

        const entry = {
            stage,
            at: iso(),
            by: uid,
            byName: await actorName(uid),
            ...(note?.trim() ? { note: note.trim().slice(0, 500) } : {}),
        };

        await ref.update({
            stage,
            updatedAt: iso(),
            // Append-only: the trail is the point, so nothing is ever rewritten.
            history: [...(prev.history ?? []), entry],
        });

        revalidatePath("/app/admin/jobs");
        return { success: true, message: `Moved to ${stage}`, data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function rateApplication(id: string, rating: number): Promise<ResponseData<null>> {
    try {
        await requireJobsAdmin("applications.manage");
        const value = Math.max(0, Math.min(5, Math.round(rating)));
        await db.collection(APPLICATIONS).doc(id).update({ rating: value, updatedAt: iso() });
        revalidatePath("/app/admin/jobs");
        return { success: true, message: "Rating saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * A short-lived link to a candidate's CV.
 *
 * CVs are personal data, so the bucket has no public read path. Reviewers get a
 * signed URL minted here and it expires in ten minutes — the same pattern the
 * Ghana Card review queue uses.
 */
export async function getResumeUrl(id: string): Promise<ResponseData<string | null>> {
    try {
        await requireJobsAdmin("applications.manage");
        const snap = await db.collection(APPLICATIONS).doc(id).get();
        const path = (snap.data() as JobApplication | undefined)?.resumePath;
        if (!path) throw new Error("No CV was attached to this application.");

        const [url] = await getStorage(getFirebaseAdminApp())
            .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
            .file(path)
            .getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });

        return { success: true, message: "ok", data: url };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteApplication(id: string): Promise<ResponseData<null>> {
    try {
        await requireJobsAdmin("applications.manage");
        const snap = await db.collection(APPLICATIONS).doc(id).get();
        const path = (snap.data() as JobApplication | undefined)?.resumePath;
        // Delete the CV too — keeping a stranger's personal document after
        // discarding their application has no justification.
        if (path) {
            await getStorage(getFirebaseAdminApp())
                .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
                .file(path).delete().catch(() => {});
        }
        await db.collection(APPLICATIONS).doc(id).delete();
        revalidatePath("/app/admin/jobs");
        return { success: true, message: "Application deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
