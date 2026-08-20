import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink, Building2, Globe, Mail, Phone, FileText } from "lucide-react";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getOrganisation } from "@/app/app/actions/organisations";
import { can } from "@/lib/roles";
import {
    ORG_ROLE_LABELS, ORG_STATUS_LABELS, ORG_STATUS_TONE, ORG_TYPE_LABELS, impactSentence,
} from "@/lib/organisations";
import { Badge, Panel, Stat } from "@/components/admin/ui";
import { OrgDecision } from "@/components/admin/organisations/OrgDecision";

export const metadata = { title: "Organisation — Admin" };

export default async function OrgDetailPage({ params }: { params: { id: string } }) {
    const role = await getMyAdminRole();
    if (!can(role, "organisations.view")) redirect("/app/admin");

    const res = await getOrganisation(params.id);
    if (!res.success || !res.data) notFound();

    const { org, impact, team, steps } = res.data;

    const contact = [
        { icon: Mail, value: org.contactEmail, href: `mailto:${org.contactEmail}` },
        ...(org.contactPhone ? [{ icon: Phone, value: org.contactPhone, href: `tel:${org.contactPhone}` }] : []),
        ...(org.website ? [{ icon: Globe, value: org.website, href: org.website }] : []),
        ...(org.registrationNumber ? [{ icon: FileText, value: `Reg. ${org.registrationNumber}`, href: undefined }] : []),
    ];

    return (
        <div className="space-y-4">
            <Link
                href="/app/admin/organisations"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-forest transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" /> All organisations
            </Link>

            <Panel flush>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <span className="w-11 h-11 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {org.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={org.logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <Building2 className="w-5 h-5 text-gray-400" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h1 className="text-base font-semibold text-ink truncate">{org.name}</h1>
                                <Badge tone={ORG_STATUS_TONE[org.status]}>{ORG_STATUS_LABELS[org.status]}</Badge>
                                {org.verified && <Badge tone="good">Verified</Badge>}
                            </div>
                            <p className="text-[13px] text-gray-500">
                                {ORG_TYPE_LABELS[org.type]}
                                {org.locationName ? ` · ${org.locationName}` : ""}
                            </p>
                            <p className="text-[13px] text-ink mt-0.5">{org.contactName}</p>
                        </div>
                    </div>
                    {org.status === "active" && (
                        <Link
                            href={`/o/${org.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> View storefront
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-200 [&>*:nth-child(4n)]:border-r-0">
                    <Stat label="Listed" value={impact.listed} hint={`${impact.available} available`} />
                    <Stat label="Rehomed" value={impact.rehomed} hint={`${impact.rehomingRate}% of listings`} />
                    <Stat label="Households" value={impact.householdsReached} hint="distinct recipients" />
                    <Stat label="Diverted" value={`${impact.kgDiverted} kg`} hint="estimated" />
                </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
                <div className="space-y-4 min-w-0">
                    {org.motivation && (
                        <Panel title="Why they applied">
                            <p className="text-[13px] text-ink whitespace-pre-line leading-relaxed">{org.motivation}</p>
                        </Panel>
                    )}

                    <Panel title="Contact">
                        <ul className="space-y-1.5">
                            {contact.map((c) => (
                                <li key={c.value} className="flex items-center gap-2 text-[13px]">
                                    <c.icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    {c.href ? (
                                        <a
                                            href={c.href}
                                            target={c.href.startsWith("http") ? "_blank" : undefined}
                                            rel="noopener noreferrer"
                                            className="text-forest hover:underline truncate"
                                        >
                                            {c.value}
                                        </a>
                                    ) : (
                                        <span className="text-ink truncate">{c.value}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title={`Team (${team.length})`}>
                        {team.length === 0 ? (
                            <p className="text-xs text-gray-400">Nobody yet.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {team.map((m) => (
                                    <li key={m.uid} className="flex items-center justify-between gap-2 text-[13px]">
                                        <Link href={`/app/admin/crm/${m.uid}`} className="text-ink hover:text-forest truncate">
                                            {m.name || m.email}
                                        </Link>
                                        <Badge tone="neutral">{ORG_ROLE_LABELS[m.role]}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {impact.rehomed > 0 && (
                        <Panel title="Their impact line" description="What they can put in a report.">
                            <p className="text-[13px] text-ink leading-relaxed">{impactSentence(org, impact)}</p>
                        </Panel>
                    )}
                </div>

                <div className="space-y-4 min-w-0">
                    <OrgDecision
                        id={org.id!}
                        status={org.status}
                        verified={!!org.verified}
                        notes={org.internalNotes ?? ""}
                        canManage={can(role, "organisations.manage")}
                    />

                    <Panel title="Setup progress">
                        <ul className="space-y-1.5">
                            {steps.map((s) => (
                                <li key={s.id} className="flex items-start gap-2 text-[13px]">
                                    <span
                                        className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                            s.done ? "bg-emerald-500" : "bg-gray-300"
                                        }`}
                                    />
                                    <span className={s.done ? "text-gray-400 line-through" : "text-ink"}>{s.label}</span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
