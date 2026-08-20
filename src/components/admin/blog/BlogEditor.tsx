"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Loader2, Save, Eye, Code2, ExternalLink, Check, AlertTriangle,
    CircleAlert, X, Plus, ImagePlus, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createPost, updatePost, type PostInput } from "@/app/app/actions/blog";
import {
    BlogPost, SEO_DESC_MAX, SEO_TITLE_MAX, auditSeo, isValidSlug,
    normaliseTag, seoScore, slugify,
} from "@/lib/blog";
import { renderMarkdown, excerptFrom, readingTimeMinutes } from "@/lib/markdown";
import { Badge, Button, Input, Panel, Textarea } from "../ui";
import { IMAGE_TYPES, imageRejectionReason, uploadBlogImage } from "./uploadBlogImage";
import { PollEditor } from "./PollEditor";

const EMPTY: PostInput = {
    title: "",
    slug: "",
    body: "",
    excerpt: "",
    coverUrl: "",
    coverAlt: "",
    tags: [],
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    noindex: false,
    poll: null,
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";

export function BlogEditor({ post }: { post?: BlogPost }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [tab, setTab] = useState<"write" | "preview">("write");
    const [tagDraft, setTagDraft] = useState("");
    // Once the slug is edited by hand, stop following the title — otherwise a
    // late title tweak silently changes a published URL.
    const [slugTouched, setSlugTouched] = useState(!!post?.slug);

    const [form, setForm] = useState<PostInput>(
        post
            ? {
                  title: post.title, slug: post.slug, body: post.body, excerpt: post.excerpt ?? "",
                  coverUrl: post.coverUrl ?? "", coverAlt: post.coverAlt ?? "", tags: post.tags ?? [],
                  status: post.status, seoTitle: post.seoTitle ?? "",
                  seoDescription: post.seoDescription ?? "", canonicalUrl: post.canonicalUrl ?? "",
                  noindex: post.noindex ?? false, poll: post.poll ?? null,
              }
            : EMPTY
    );

    const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const onTitle = (title: string) => {
        setForm((f) => ({ ...f, title, ...(slugTouched ? {} : { slug: slugify(title) }) }));
    };

    const html = useMemo(() => renderMarkdown(form.body), [form.body]);
    const checks = useMemo(() => auditSeo(form), [form]);
    const score = seoScore(checks);
    const minutes = readingTimeMinutes(form.body);
    const autoExcerpt = useMemo(() => excerptFrom(form.body), [form.body]);

    const save = (status: "draft" | "published") => {
        startTransition(async () => {
            const payload = { ...form, status };
            const res = post?.id ? await updatePost(post.id, payload) : await createPost(payload);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            if (!post?.id && res.data) router.push(`/app/admin/blog/${res.data}`);
            else router.refresh();
        });
    };

    const addTag = (raw: string) => {
        const t = normaliseTag(raw);
        if (t.length < 2) return;
        if (form.tags?.includes(t)) { setTagDraft(""); return; }
        set("tags", [...(form.tags ?? []), t].slice(0, 8));
        setTagDraft("");
    };

    /* ── Image upload ──────────────────────────────────────────────────── */

    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const bodyFileRef = useRef<HTMLInputElement>(null);
    const coverFileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState<null | "cover" | "body">(null);
    const [uploadPct, setUploadPct] = useState(0);
    const [dragOver, setDragOver] = useState(false);

    /**
     * Insert markdown at the caret rather than appending.
     *
     * Someone who drops an image halfway down a draft means it to land there,
     * and an editor that silently moves it to the end is one people stop
     * trusting.
     */
    const insertAtCaret = useCallback((snippet: string) => {
        const el = bodyRef.current;
        if (!el) {
            setForm((f) => ({ ...f, body: `${f.body}\n\n${snippet}\n` }));
            return;
        }
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        setForm((f) => {
            const next = `${f.body.slice(0, start)}\n\n${snippet}\n\n${f.body.slice(end)}`;
            // Put the caret after what we inserted, once React has re-rendered.
            requestAnimationFrame(() => {
                const pos = start + snippet.length + 4;
                el.focus();
                el.setSelectionRange(pos, pos);
            });
            return { ...f, body: next };
        });
    }, []);

    const handleUpload = useCallback(
        async (file: File, target: "cover" | "body") => {
            const reason = imageRejectionReason(file);
            if (reason) { toast.error(reason); return; }

            setUploading(target);
            setUploadPct(0);
            try {
                const url = await uploadBlogImage(file, setUploadPct);
                if (target === "cover") {
                    setForm((f) => ({
                        ...f,
                        coverUrl: url,
                        // Seed alt text from the filename so the SEO check stops
                        // complaining, but leave it obviously editable.
                        coverAlt: f.coverAlt || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
                    }));
                } else {
                    insertAtCaret(`![](${url})`);
                }
                toast.success("Image uploaded");
            } catch (e: any) {
                toast.error(e?.message || "Couldn't upload that image.");
            } finally {
                setUploading(null);
                setUploadPct(0);
            }
        },
        [insertAtCaret]
    );

    const previewTitle = (form.seoTitle?.trim() || form.title || "Untitled post").slice(0, 70);
    const previewDesc = (form.seoDescription?.trim() || form.excerpt?.trim() || autoExcerpt || "").slice(0, 180);

    return (
        <div className="space-y-4">
            {/* One input per target, reset after each pick so choosing the same
                file twice still fires a change event. */}
            <input
                ref={coverFileRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) handleUpload(f, "cover");
                }}
            />
            <input
                ref={bodyFileRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) handleUpload(f, "body");
                }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Link href="/app/admin/blog" className="text-xs font-semibold text-gray-500 hover:text-forest">
                        ← All posts
                    </Link>
                    {post && (
                        <Badge tone={post.status === "published" ? "good" : "neutral"}>
                            {post.status === "published" ? "Live" : "Draft"}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {post?.status === "published" && (
                        <Link href={`/blog/${post.slug}`} target="_blank">
                            <Button><ExternalLink className="w-3.5 h-3.5" /> View</Button>
                        </Link>
                    )}
                    <Button onClick={() => save("draft")} disabled={pending}>
                        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save draft
                    </Button>
                    <Button variant="primary" onClick={() => save("published")} disabled={pending}>
                        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {post?.status === "published" ? "Update" : "Publish"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
                {/* ── Writing ── */}
                <div className="space-y-4 min-w-0">
                    <Panel flush>
                        <div className="p-4 pb-0">
                            <input
                                value={form.title}
                                onChange={(e) => onTitle(e.target.value)}
                                placeholder="Post title"
                                aria-label="Post title"
                                className="w-full text-2xl font-bold text-ink placeholder-gray-300 outline-none bg-transparent"
                            />
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                                <span className="flex-shrink-0">{SITE}/blog/</span>
                                <input
                                    value={form.slug}
                                    onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                                    placeholder="url-slug"
                                    aria-label="URL slug"
                                    className={`flex-1 min-w-0 bg-transparent outline-none border-b border-dashed pb-0.5 ${
                                        form.slug && !isValidSlug(form.slug)
                                            ? "border-red-300 text-red-600"
                                            : "border-gray-300 text-gray-600 focus:border-forest"
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 mt-3 border-b border-gray-200">
                            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                                {(["write", "preview"] as const).map((t, i) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        aria-pressed={tab === t}
                                        className={`px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 ${
                                            i > 0 ? "border-l border-gray-300" : ""
                                        } ${tab === t ? "bg-forest text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        {t === "write" ? <Code2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {t === "write" ? "Write" : "Preview"}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => bodyFileRef.current?.click()}
                                    disabled={uploading !== null}
                                    title="Insert an image at the cursor"
                                >
                                    {uploading === "body"
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <ImagePlus className="w-3.5 h-3.5" />}
                                    {uploading === "body" ? `${uploadPct}%` : "Image"}
                                </Button>
                                <span className="text-[11px] text-gray-400 tabular-nums">
                                    {minutes} min read · markdown
                                </span>
                            </div>
                        </div>

                        {tab === "write" ? (
                            <textarea
                                ref={bodyRef}
                                value={form.body}
                                onChange={(e) => set("body", e.target.value)}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                    const file = e.dataTransfer.files?.[0];
                                    if (!file) return;
                                    e.preventDefault();
                                    setDragOver(false);
                                    handleUpload(file, "body");
                                }}
                                onPaste={(e) => {
                                    // Screenshots arrive on the clipboard as files.
                                    const file = Array.from(e.clipboardData.files)[0];
                                    if (!file) return;
                                    e.preventDefault();
                                    handleUpload(file, "body");
                                }}
                                placeholder={"Write in markdown.\n\n## A heading\n\nSome **bold** text and a [link](https://example.com).\n\n- a list item\n- another\n\n> a quote\n\nDrop or paste an image straight in."}
                                aria-label="Post body"
                                spellCheck
                                className={`w-full min-h-[460px] p-4 text-[14px] leading-relaxed text-ink font-mono outline-none resize-y transition-colors ${
                                    dragOver ? "bg-lime/20" : "bg-white"
                                }`}
                            />
                        ) : (
                            <article
                                className="prose-givny p-5 min-h-[460px]"
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        )}
                    </Panel>
                </div>

                {/* ── Metadata ── */}
                <div className="space-y-4 min-w-0">
                    <Panel
                        title="Search preview"
                        description="Roughly how this appears on Google."
                        actions={
                            <Badge tone={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}>{score}%</Badge>
                        }
                    >
                        <div className="rounded-md border border-gray-200 p-3 bg-white">
                            <p className="text-[11px] text-gray-500 truncate">{SITE}/blog/{form.slug || "…"}</p>
                            <p className="text-[15px] text-blue-800 leading-snug mt-0.5 line-clamp-2">
                                {previewTitle}
                            </p>
                            <p className="text-[12px] text-gray-600 leading-snug mt-0.5 line-clamp-3">
                                {previewDesc || "No description yet — search engines will invent one."}
                            </p>
                        </div>

                        <ul className="mt-3 space-y-1.5">
                            {checks.map((c) => (
                                <li key={c.id} className="flex gap-1.5 text-[11px] leading-snug">
                                    {c.level === "ok" ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-px" />
                                    ) : c.level === "warn" ? (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px" />
                                    ) : (
                                        <CircleAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-px" />
                                    )}
                                    <span className={c.level === "ok" ? "text-gray-500" : "text-ink"}>
                                        <span className="font-semibold">{c.label}:</span> {c.detail}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Poll">
                        <PollEditor poll={form.poll} onChange={(poll) => set("poll", poll)} />
                    </Panel>

                    <Panel title="SEO">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                            Meta title
                        </label>
                        <Input
                            value={form.seoTitle}
                            onChange={(e) => set("seoTitle", e.target.value)}
                            placeholder={form.title || "Defaults to the post title"}
                            className="w-full mt-1"
                        />
                        <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                            {(form.seoTitle || form.title || "").length}/{SEO_TITLE_MAX}
                        </p>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">
                            Meta description
                        </label>
                        <Textarea
                            rows={3}
                            value={form.seoDescription}
                            onChange={(e) => set("seoDescription", e.target.value)}
                            placeholder={autoExcerpt || "Defaults to the excerpt"}
                            className="mt-1"
                        />
                        <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                            {(form.seoDescription || form.excerpt || autoExcerpt || "").length}/{SEO_DESC_MAX}
                        </p>

                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mt-3">
                            Canonical URL
                        </label>
                        <Input
                            value={form.canonicalUrl}
                            onChange={(e) => set("canonicalUrl", e.target.value)}
                            placeholder="Only if this was published elsewhere first"
                            className="w-full mt-1"
                        />

                        <label className="flex items-center gap-2 mt-3 text-[13px] text-ink cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!form.noindex}
                                onChange={(e) => set("noindex", e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Hide from search engines
                        </label>
                    </Panel>

                    <Panel title="Cover image" description="Shown on cards and in link previews.">
                        {form.coverUrl ? (
                            <div className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={form.coverUrl}
                                    alt={form.coverAlt || ""}
                                    className="w-full rounded-md border border-gray-200 aspect-[16/9] object-cover bg-gray-50"
                                />
                                <div className="absolute inset-0 rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button onClick={() => coverFileRef.current?.click()} disabled={uploading !== null}>
                                        <Upload className="w-3.5 h-3.5" /> Replace
                                    </Button>
                                    <Button variant="danger" onClick={() => set("coverUrl", "")}>
                                        <X className="w-3.5 h-3.5" /> Remove
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => coverFileRef.current?.click()}
                                disabled={uploading !== null}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const f = e.dataTransfer.files?.[0];
                                    if (!f) return;
                                    e.preventDefault();
                                    handleUpload(f, "cover");
                                }}
                                className="w-full border border-dashed border-gray-300 rounded-md py-7 text-center hover:border-forest hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {uploading === "cover" ? (
                                    <>
                                        <Loader2 className="w-5 h-5 text-forest mx-auto animate-spin" />
                                        <span className="block text-[13px] font-semibold text-ink mt-1.5 tabular-nums">
                                            {uploadPct}%
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                                        <span className="block text-[13px] font-semibold text-ink mt-1.5">
                                            Upload a cover
                                        </span>
                                        <span className="block text-[11px] text-gray-400 mt-0.5">
                                            Drop it here, or click. Up to 8 MB.
                                        </span>
                                    </>
                                )}
                            </button>
                        )}

                        <Input
                            value={form.coverAlt}
                            onChange={(e) => set("coverAlt", e.target.value)}
                            placeholder="Alt text — describe the image"
                            aria-label="Cover alt text"
                            className="w-full mt-2"
                        />

                        {/* Still accept a URL: not every cover is a file you hold. */}
                        <details className="mt-2">
                            <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600">
                                Use an image URL instead
                            </summary>
                            <Input
                                value={form.coverUrl}
                                onChange={(e) => set("coverUrl", e.target.value)}
                                placeholder="https://…"
                                aria-label="Cover image URL"
                                className="w-full mt-1.5"
                            />
                        </details>
                    </Panel>

                    <Panel title="Excerpt" description="Shown on cards. Falls back to the opening lines.">
                        <Textarea
                            rows={3}
                            value={form.excerpt}
                            onChange={(e) => set("excerpt", e.target.value)}
                            placeholder={autoExcerpt}
                        />
                    </Panel>

                    <Panel title="Tags">
                        <div className="flex flex-wrap gap-1.5">
                            {(form.tags ?? []).map((t) => (
                                <span key={t} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                    {t}
                                    <button onClick={() => set("tags", form.tags!.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {!form.tags?.length && <p className="text-xs text-gray-400">No tags yet.</p>}
                        </div>
                        <div className="flex gap-1.5 mt-2">
                            <Input
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagDraft); } }}
                                placeholder="Add a tag…"
                                aria-label="Add a tag"
                                className="flex-1 min-w-0"
                            />
                            <Button onClick={() => addTag(tagDraft)} disabled={!tagDraft.trim()}>
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
