"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Check, FileText, X, AlertCircle } from "lucide-react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/firebase/auth/firebase";
import { submitApplication } from "@/app/app/actions/jobs";
import {
    RESUME_MAX_BYTES, RESUME_TYPES, isAcceptedResume, isValidEmail, isValidPhone,
} from "@/lib/jobs";

/**
 * Public application form.
 *
 * No account required — asking a candidate to register before they can apply
 * loses good people for nothing. The CV goes straight to Storage under a path
 * scoped to this job, and only that path is sent to the server action, which
 * re-checks it belongs to the job before saving.
 */
export function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
    const [pending, startTransition] = useTransition();
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const doneRef = useRef<HTMLDivElement>(null);

    /**
     * Put the confirmation where the person is looking.
     *
     * The form is long, so send is pressed near the bottom of the page. The
     * panel that replaces it is short, and on a phone it can end up above the
     * viewport entirely — which is exactly how a successful application comes
     * to look like nothing happened at all.
     */
    useEffect(() => {
        if (done) doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [done]);

    const [form, setForm] = useState({ name: "", email: "", phone: "", coverNote: "" });
    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const pickFile = (f: File | null) => {
        setError(null);
        if (!f) { setFile(null); return; }
        if (!isAcceptedResume(f)) {
            setError(
                f.size > RESUME_MAX_BYTES
                    ? "That file is over 5 MB."
                    : "Please attach a PDF or Word document."
            );
            return;
        }
        setFile(f);
    };

    const submit = async () => {
        setError(null);

        if (form.name.trim().length < 2) return setError("Please give your full name.");
        if (!isValidEmail(form.email)) return setError("That email address doesn't look right.");
        if (form.phone.trim() && !isValidPhone(form.phone)) {
            return setError("That phone number doesn't look like a Ghanaian number.");
        }

        let resumePath = "";
        let resumeName = "";

        try {
            if (file) {
                // Path is namespaced by job so the server can verify it, and by
                // timestamp so two applicants named cv.pdf don't collide.
                const safe = (file.name || "cv").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-48);
                resumePath = `resumes/${jobId}/${Date.now()}_${safe}`;
                resumeName = file.name;

                await new Promise<void>((resolve, reject) => {
                    const task = uploadBytesResumable(ref(storage, resumePath), file, {
                        contentType: file.type,
                    });
                    task.on(
                        "state_changed",
                        (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
                        reject,
                        () => resolve()
                    );
                });
                setProgress(null);
            }
        } catch {
            setProgress(null);
            setError("We couldn't upload your CV. Check your connection and try again.");
            return;
        }

        startTransition(async () => {
            const res = await submitApplication({ jobId, ...form, resumePath, resumeName });
            if (!res.success) {
                setError(res.message);
                // The error sits at the foot of a long form, which is not
                // necessarily where the person is looking after pressing send.
                toast.error("Couldn't send your application", { description: res.message });
                return;
            }

            setDone(true);
            toast.success("Application sent", {
                description: `We'll be in touch at ${form.email}.`,
                duration: 6000,
            });
        });
    };

    if (done) {
        return (
            <div ref={doneRef} className="bg-forest rounded-3xl p-8 md:p-10 text-center">
                <span className="inline-flex w-12 h-12 rounded-full bg-lime text-forest items-center justify-center mb-4">
                    <Check className="w-6 h-6" />
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">Application received</h2>
                <p className="text-white/70 mt-2 max-w-sm mx-auto leading-relaxed">
                    Thanks for applying for {jobTitle}. We read every application and will be in touch
                    at {form.email} either way.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200/70 rounded-3xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-ink tracking-tight">Apply for this role</h2>
            <p className="text-sm text-gray-500 mt-1">No account needed. It takes about two minutes.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Full name *</span>
                    <input
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="w-full mt-1.5 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all"
                        placeholder="Ama Mensah"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Email *</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        className="w-full mt-1.5 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all"
                        placeholder="ama@example.com"
                    />
                </label>
            </div>

            <label className="block mt-4">
                <span className="text-sm font-semibold text-ink">Phone</span>
                <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="w-full mt-1.5 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all"
                    placeholder="024 123 4567"
                />
            </label>

            <label className="block mt-4">
                <span className="text-sm font-semibold text-ink">Why you?</span>
                <textarea
                    rows={5}
                    value={form.coverNote}
                    onChange={(e) => set("coverNote", e.target.value)}
                    className="w-full mt-1.5 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all resize-y"
                    placeholder="A few lines beat a long letter. What have you built, and why this?"
                />
            </label>

            <div className="mt-4">
                <span className="text-sm font-semibold text-ink">CV</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept={RESUME_TYPES.join(",")}
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                />

                {file ? (
                    <div className="flex items-center gap-3 mt-1.5 border border-gray-200 rounded-2xl px-4 py-3">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label="Remove CV" className="text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-full mt-1.5 border border-dashed border-gray-300 rounded-2xl px-4 py-6 text-center hover:border-forest hover:bg-sand/40 transition-colors"
                    >
                        <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                        <span className="block text-sm font-semibold text-ink mt-1.5">Attach your CV</span>
                        <span className="block text-xs text-gray-400 mt-0.5">PDF or Word, up to 5 MB</span>
                    </button>
                )}

                {progress !== null && (
                    <div className="h-1 bg-sand rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-forest transition-all" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            {error && (
                <p className="flex items-center gap-2 mt-4 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </p>
            )}

            <button
                onClick={submit}
                disabled={pending || progress !== null}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-forest hover:bg-forest-dark text-white font-bold px-8 py-3.5 rounded-full mt-6 transition-colors disabled:opacity-50"
            >
                {pending || progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {progress !== null ? "Uploading…" : pending ? "Sending…" : "Send application"}
            </button>

            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                We use what you send only to consider you for this role.
            </p>
        </div>
    );
}
