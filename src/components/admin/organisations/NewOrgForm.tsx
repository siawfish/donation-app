"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminCreateOrganisation, type AdminOrgInput } from "@/app/app/actions/organisations";
import { ORG_TYPE_LABELS, type OrgType, slugifyOrg } from "@/lib/organisations";
import { Button, Input, Panel, Textarea } from "../ui";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";
const HINT = "text-[11px] text-gray-400 mt-1";

const EMPTY: AdminOrgInput = {
    name: "", type: "business", slug: "",
    contactName: "", contactEmail: "", contactPhone: "",
    registrationNumber: "", website: "", locationName: "",
    tagline: "", about: "", logoUrl: "", coverUrl: "",
    internalNotes: "", publish: false,
};

/**
 * Build an organisation's page before they have applied.
 *
 * The page is created with no owner at all — it belongs to nobody until an
 * invitation is accepted. That is deliberate: it is the difference between
 * "we made you a page" and "we made an account in your name".
 */
export function NewOrgForm() {
    const router = useRouter();
    const [form, setForm] = useState<AdminOrgInput>(EMPTY);
    const [slugTouched, setSlugTouched] = useState(false);
    const [pending, startTransition] = useTransition();

    const set = <K extends keyof AdminOrgInput>(key: K, value: AdminOrgInput[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const setName = (name: string) =>
        setForm((f) => ({ ...f, name, ...(slugTouched ? {} : { slug: slugifyOrg(name) }) }));

    const submit = () => {
        startTransition(async () => {
            const res = await adminCreateOrganisation(form);
            if (!res.success || !res.data) { toast.error(res.message); return; }
            toast.success(res.message);
            router.push(`/app/admin/organisations/${res.data.id}`);
        });
    };

    return (
        <div className="space-y-4 max-w-3xl">
            <Panel
                title="New organisation"
                description="Builds the page on their behalf. Nobody owns it until they accept an invitation."
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block sm:col-span-2">
                        <span className={LABEL}>Name</span>
                        <Input
                            value={form.name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Melcom Ghana"
                            className="w-full mt-1"
                        />
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

                    <label className="block">
                        <span className={LABEL}>Page address</span>
                        <Input
                            value={form.slug}
                            onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                            placeholder="melcom-ghana"
                            className="w-full mt-1"
                        />
                        <p className={HINT}>givny.com/o/{slugifyOrg(form.slug || form.name) || "…"}</p>
                    </label>
                </div>
            </Panel>

            <Panel title="Who to invite" description="The person who will take the page over. You'll get a link to send them.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                        <span className={LABEL}>Contact name</span>
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
                </div>
            </Panel>

            <Panel title="The page itself" description="Everything here is editable by them once they claim it.">
                <div className="space-y-3">
                    <label className="block">
                        <span className={LABEL}>Tagline</span>
                        <Input
                            value={form.tagline}
                            onChange={(e) => set("tagline", e.target.value)}
                            maxLength={120}
                            placeholder="One line about what they do."
                            className="w-full mt-1"
                        />
                    </label>

                    <label className="block">
                        <span className={LABEL}>About</span>
                        <Textarea
                            rows={5}
                            value={form.about}
                            onChange={(e) => set("about", e.target.value)}
                            placeholder="Markdown works here."
                            className="w-full mt-1"
                        />
                        <p className={HINT}>Write what you actually know about them — they can correct it.</p>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <Input value={form.locationName} onChange={(e) => set("locationName", e.target.value)} placeholder="Tema, Ghana" className="w-full mt-1" />
                        </label>
                    </div>
                </div>
            </Panel>

            <Panel title="Internal" description="Never shown publicly.">
                <div className="space-y-3">
                    <label className="block">
                        <span className={LABEL}>Registration number</span>
                        <Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} className="w-full mt-1" />
                        <p className={HINT}>Recorded, but the page is not verified until someone checks real evidence.</p>
                    </label>
                    <label className="block">
                        <span className={LABEL}>Notes</span>
                        <Textarea rows={3} value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} className="w-full mt-1" />
                    </label>
                </div>
            </Panel>

            <Panel title="Publish">
                <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!form.publish}
                        onChange={(e) => set("publish", e.target.checked)}
                        className="mt-0.5"
                    />
                    <span>
                        <span className="text-[13px] font-semibold text-ink">Make the page public now</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            It will carry a banner saying Givny prepared it and the organisation
                            hasn&rsquo;t claimed it, and search engines are told not to index it.
                            Leave this off to keep it as a draft only you can see.
                        </span>
                    </span>
                </label>

                <div className="flex items-center gap-2 mt-4">
                    <Button variant="primary" onClick={submit} disabled={pending}>
                        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Create organisation
                    </Button>
                    <Button onClick={() => router.push("/app/admin/organisations")} disabled={pending}>
                        Cancel
                    </Button>
                </div>
            </Panel>
        </div>
    );
}
