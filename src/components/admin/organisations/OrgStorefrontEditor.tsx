"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { adminUpdateOrganisation, type AdminOrgEdit } from "@/app/app/actions/organisations";
import {
    ORG_TYPE_LABELS, type ClaimStatus, type OrgType, type Organisation, slugifyOrg,
} from "@/lib/organisations";
import { Button, Input, Panel, Textarea } from "../ui";
import { PUBLIC_SITE_URL as SITE } from "@/lib/seo";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";
const HINT = "text-[11px] text-gray-400 mt-1";

/**
 * Edit an organisation's public page from the admin side.
 *
 * Collapsed by default. On a claimed page these are somebody else's words, and
 * an editor sitting permanently open invites edits nobody asked for.
 */
export function OrgStorefrontEditor({
    org,
    claim,
}: {
    org: Organisation;
    claim?: ClaimStatus;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const [form, setForm] = useState<AdminOrgEdit>({
        name: org.name ?? "",
        type: org.type,
        slug: org.slug ?? "",
        tagline: org.tagline ?? "",
        about: org.about ?? "",
        logoUrl: org.logoUrl ?? "",
        coverUrl: org.coverUrl ?? "",
        website: org.website ?? "",
        locationName: org.locationName ?? "",
        contactName: org.contactName ?? "",
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        registrationNumber: org.registrationNumber ?? "",
    });

    const set = <K extends keyof AdminOrgEdit>(key: K, value: AdminOrgEdit[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const nextSlug = slugifyOrg(form.slug || form.name);
    const slugChanged = nextSlug !== org.slug;
    const nameChanged = form.name.trim() !== org.name;
    const claimed = claim === "claimed";

    const save = () => {
        startTransition(async () => {
            const res = await adminUpdateOrganisation(org.id!, form);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            router.refresh();
        });
    };

    return (
        <Panel
            title="Storefront"
            description={
                claimed
                    ? "This page belongs to the organisation. Edits are logged against your name."
                    : "Build the page out before you hand it over."
            }
            actions={
                <div className="flex items-center gap-2">
                    <a
                        href={`${SITE}/o/${org.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                    >
                        View <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Edit"}</Button>
                </div>
            }
        >
            {!open ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {[
                        ["Address", `/o/${org.slug}`],
                        ["Type", ORG_TYPE_LABELS[org.type]],
                        ["Tagline", org.tagline || "—"],
                        ["Location", org.locationName || "—"],
                        ["Logo", org.logoUrl ? "Set" : "Not set"],
                        ["Cover", org.coverUrl ? "Set" : "Not set"],
                        ["About", org.about ? `${org.about.trim().length} characters` : "Not written"],
                        ["Website", org.website || "—"],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
                            <dt className="text-[11px] uppercase tracking-[0.06em] text-gray-500 flex-shrink-0">{label}</dt>
                            <dd className="text-[13px] text-ink text-right truncate">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <div className="space-y-4">
                    {claimed && (
                        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2 leading-relaxed">
                            <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>
                                {org.name} runs this page themselves. Change it only if they asked
                                you to, or something on it has to come down — they will see the
                                change without being told it was you.
                            </span>
                        </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className={LABEL}>Name</span>
                            <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full mt-1" />
                            {nameChanged && (
                                <p className={HINT}>
                                    Renaming also updates the name shown on every item they have listed.
                                </p>
                            )}
                        </label>

                        <label className="block">
                            <span className={LABEL}>Type</span>
                            <select
                                value={form.type}
                                onChange={(e) => set("type", e.target.value as OrgType)}
                                className="w-full mt-1 bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                            >
                                {Object.entries(ORG_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block sm:col-span-2">
                            <span className={LABEL}>Page address</span>
                            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="w-full mt-1" />
                            <p className={HINT}>givny.com/o/{nextSlug || "…"}</p>
                            {slugChanged && (
                                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                                    Changing the address breaks every link already shared to
                                    <span className="font-semibold"> /o/{org.slug}</span>, including any in a
                                    newsletter or printed material.
                                </p>
                            )}
                        </label>

                        <label className="block sm:col-span-2">
                            <span className={LABEL}>Tagline</span>
                            <Input
                                value={form.tagline}
                                onChange={(e) => set("tagline", e.target.value)}
                                maxLength={120}
                                className="w-full mt-1"
                            />
                        </label>

                        <label className="block sm:col-span-2">
                            <span className={LABEL}>About</span>
                            <Textarea
                                rows={6}
                                value={form.about}
                                onChange={(e) => set("about", e.target.value)}
                                placeholder="Markdown works here."
                                className="w-full mt-1 font-mono text-[12px]"
                            />
                        </label>

                        <label className="block">
                            <span className={LABEL}>Logo URL</span>
                            <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" className="w-full mt-1" />
                        </label>
                        <label className="block">
                            <span className={LABEL}>Cover image URL</span>
                            <Input value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} placeholder="https://…" className="w-full mt-1" />
                        </label>
                        <label className="block">
                            <span className={LABEL}>Website</span>
                            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" className="w-full mt-1" />
                        </label>
                        <label className="block">
                            <span className={LABEL}>Location</span>
                            <Input value={form.locationName} onChange={(e) => set("locationName", e.target.value)} className="w-full mt-1" />
                        </label>
                    </div>

                    {/* Preview of the two images, because a wrong URL is invisible
                        in a text field and obvious the moment it renders. */}
                    {(form.logoUrl || form.coverUrl) && (
                        <div className="flex items-start gap-3">
                            {form.logoUrl && (
                                <span className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={form.logoUrl} alt="" className="w-full h-full object-contain" />
                                </span>
                            )}
                            {form.coverUrl && (
                                <span className="h-16 flex-1 rounded-lg bg-gray-100 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
                                </span>
                            )}
                        </div>
                    )}

                    <div className="pt-1 border-t border-gray-100">
                        <p className={`${LABEL} pt-3`}>Contact — never shown publicly</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-2">
                            <label className="block">
                                <span className={LABEL}>Name</span>
                                <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className="w-full mt-1" />
                            </label>
                            <label className="block">
                                <span className={LABEL}>Email</span>
                                <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className="w-full mt-1" />
                            </label>
                            <label className="block">
                                <span className={LABEL}>Phone</span>
                                <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className="w-full mt-1" />
                            </label>
                            <label className="block">
                                <span className={LABEL}>Reg. number</span>
                                <Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} className="w-full mt-1" />
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="primary" onClick={save} disabled={pending}>
                            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save storefront
                        </Button>
                        <Button onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
                    </div>
                </div>
            )}
        </Panel>
    );
}
