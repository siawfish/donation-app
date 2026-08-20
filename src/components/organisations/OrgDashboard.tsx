"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Check, Loader2, ExternalLink, Leaf, Package, Users2, Copy, Plus,
    Trash2, ArrowRight, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { OrgCrest } from "./OrgCrest";
import {
    addTeamMember, getMyOrg, removeTeamMember, updateStorefront, type MyOrg,
} from "@/app/app/actions/organisations";
import {
    ABOUT_MIN_CHARS, ORG_ROLE_BLURB, ORG_ROLE_LABELS, ORG_STATUS_LABELS,
    ORG_TYPE_LABELS, OrgRole, impactSentence, onboardingProgress, orgCan,
} from "@/lib/organisations";

type Tab = "overview" | "storefront" | "team";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";
const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all";

export function OrgDashboard({ initial }: { initial: MyOrg }) {
    const [data, setData] = useState(initial);
    const [, startTransition] = useTransition();
    const [busy, setBusy] = useState<string | null>(null);
    /**
     * Which tab is open, seeded from the URL and kept in step with it.
     *
     * This was `useState(searchParams.get("tab"))` alone, which reads the URL
     * once on mount. The setup checklist links to ?tab=storefront from the same
     * page, so the component never remounted: the URL changed and nothing else
     * did, and "Do it" appeared to do nothing.
     */
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const fromUrl: Tab = (() => {
        const t = searchParams.get("tab");
        return t === "storefront" || t === "team" ? t : "overview";
    })();

    const [tab, setTabState] = useState<Tab>(fromUrl);

    // Follow the URL when it changes under us — this is what makes the setup
    // checklist work, since those links change only the query string and the
    // component never remounts.
    useEffect(() => { setTabState(fromUrl) }, [fromUrl]);

    const setTab = (next: Tab) => {
        // Switch immediately, then update the address bar without a router
        // navigation. router.replace would round-trip to the server on this
        // dynamic route, which is a second of lag for a tab whose content is
        // already on the client. history.replaceState keeps the URL shareable
        // and the back button pointed out of the dashboard.
        setTabState(next);
        window.history.replaceState(null, "", next === "overview" ? pathname : `${pathname}?tab=${next}`);
    };

    const { org, role, impact, steps, team, items, standing, followers } = data;
    const progress = onboardingProgress(steps);
    const url = `${SITE}/o/${org.slug}`;

    const refresh = useCallback(async () => {
        const res = await getMyOrg();
        if (res.success && res.data) setData(res.data);
    }, []);

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            if (!res.success) { setBusy(null); toast.error(res.message); return; }
            after?.();

            // Reload before releasing the button, not after.
            //
            // refresh() used to be fired and forgotten, so the save finished,
            // the button went idle and the toast appeared while the setup
            // checklist above still showed the previous state — it caught up a
            // second later, or on the *next* save. Saving something that
            // visibly changes nothing reads as a save that failed.
            await refresh();
            setBusy(null);
            toast.success(res.message);
        });
    };

    return (
        <div className="space-y-5">
            {/* Standing */}
            <section className="forest-panel rounded-3xl p-6 md:p-8 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-lime mb-1.5">
                            {ORG_TYPE_LABELS[org.type]}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{org.name}</h1>
                        <p className="text-white/60 text-sm mt-1">
                            {ORG_STATUS_LABELS[org.status]} · you are {ORG_ROLE_LABELS[role].toLowerCase()}
                        </p>
                    </div>
                    {org.status === "active" && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-lime text-forest text-sm font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all flex-shrink-0"
                        >
                            <ExternalLink className="w-4 h-4" /> View your page
                        </a>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${standing.tier.chip}`}>
                        <span aria-hidden="true">{standing.tier.emoji}</span> {standing.tier.name}
                    </span>
                    <span className="text-sm text-white/70 tabular-nums">
                        {standing.points.toLocaleString()} points
                    </span>
                    <span className="text-sm text-white/70 tabular-nums">
                        {followers} follower{followers === 1 ? "" : "s"}
                    </span>
                </div>

                {standing.nextTier && (
                    <div className="mt-3 max-w-md">
                        <div className="h-1.5 rounded-sm bg-white/15 overflow-hidden">
                            <div className="h-full bg-lime transition-all" style={{ width: `${standing.progress}%` }} />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                            {standing.pointsToNext.toLocaleString()} points to {standing.nextTier.emoji} {standing.nextTier.name}
                        </p>
                    </div>
                )}

                {impact.rehomed > 0 && (
                    <>
                        <div className="grid grid-cols-3 gap-4 mt-7">
                            {[
                                { icon: Package, v: impact.rehomed, l: "passed on" },
                                { icon: Users2, v: impact.householdsReached, l: "households" },
                                { icon: Leaf, v: `${impact.kgDiverted}kg`, l: "diverted, est." },
                            ].map((s) => (
                                <div key={s.l}>
                                    <s.icon className="w-4 h-4 text-lime mb-1.5" />
                                    <p className="text-2xl md:text-3xl font-bold tabular-nums">{s.v}</p>
                                    <p className="text-[11px] text-white/50 mt-0.5">{s.l}</p>
                                </div>
                            ))}
                        </div>

                        {/* The sentence they will actually paste into a report. */}
                        <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime mb-1.5">
                                For your report
                            </p>
                            <p className="text-white/90 text-sm leading-relaxed">{impactSentence(org, impact)}</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(impactSentence(org, impact))
                                        .then(() => toast.success("Copied"))
                                        .catch(() => toast.error("Couldn't copy"));
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-lime mt-2.5 hover:underline"
                            >
                                <Copy className="w-3.5 h-3.5" /> Copy
                            </button>
                        </div>
                    </>
                )}
            </section>

            {/* Setup — only while there is something left to do. */}
            {progress < 100 && (
                <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                    <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-base font-bold text-ink">Finish setting up</h2>
                        <span className="text-sm font-bold text-forest tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-sm bg-gray-100 overflow-hidden mt-2 mb-4">
                        <div className="h-full bg-forest transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <ul className="space-y-2">
                        {steps.map((s) => (
                            <li key={s.id} className="flex items-start gap-3">
                                <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    s.done ? "bg-forest text-white" : "border border-gray-300"
                                }`}>
                                    {s.done && <Check className="w-2.5 h-2.5" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={`block text-sm font-semibold ${s.done ? "text-gray-400 line-through" : "text-ink"}`}>
                                        {s.label}
                                    </span>
                                    {!s.done && (
                                        <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">{s.why}</span>
                                    )}
                                    {!s.done && s.hint && (
                                        <span className="inline-block text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2 py-1 mt-1.5 leading-relaxed">
                                            {s.hint}
                                        </span>
                                    )}
                                </span>
                                {!s.done && s.href && (
                                    <Link href={s.href} className="text-xs font-bold text-forest hover:underline flex-shrink-0">
                                        Do it →
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
                {(["overview", "storefront", "team"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border capitalize transition-colors ${
                            tab === t ? "bg-forest text-white border-forest" : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === "overview" && (
                <div className="space-y-5">
                    <Listings items={items} available={impact.available} />
                    <OrgCrest
                        orgName={org.name}
                        standing={standing}
                        impact={impact}
                        followers={followers}
                    />
                </div>
            )}
            {tab === "storefront" && (
                <StorefrontEditor org={org} canEdit={orgCan(role, "storefront.edit")} busy={busy} run={run} />
            )}
            {tab === "team" && (
                <Team team={team} canManage={orgCan(role, "team.manage")} busy={busy} run={run} />
            )}
        </div>
    );
}

function Listings({ items, available }: { items: MyOrg["items"]; available: number }) {
    return (
        <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-ink">
                    {items.length} listing{items.length === 1 ? "" : "s"}
                    <span className="text-gray-400 font-normal"> · {available} available</span>
                </h2>
                <Link href="/app/add-item" className="inline-flex items-center gap-1.5 bg-lime text-forest text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all">
                    <Plus className="w-3.5 h-3.5" /> List an item
                </Link>
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-gray-400">
                    Nothing listed yet. Your first item makes the page worth sharing.
                </p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {items.slice(0, 12).map((item) => (
                        <li key={item.id} className="flex items-center gap-3 py-2.5">
                            <span className="w-10 h-10 rounded-xl bg-sand overflow-hidden flex-shrink-0">
                                {item.assets?.[0]?.url && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={item.assets[0].url} alt="" className="w-full h-full object-cover" />
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink truncate">{item.name}</span>
                                <span className="block text-xs text-gray-400">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                                </span>
                            </span>
                            <span className={`text-[11px] font-bold flex-shrink-0 ${item.donatedTo ? "text-primary" : "text-gray-400"}`}>
                                {item.donatedTo ? "rehomed" : "available"}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

type Run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => void;

function StorefrontEditor({
    org, canEdit, busy, run,
}: { org: MyOrg["org"]; canEdit: boolean; busy: string | null; run: Run }) {
    const [form, setForm] = useState({
        tagline: org.tagline ?? "", about: org.about ?? "", logoUrl: org.logoUrl ?? "",
        coverUrl: org.coverUrl ?? "", website: org.website ?? "", locationName: org.locationName ?? "",
    });
    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    // The setup checklist holds out for a real paragraph, so say so next to the
    // field rather than letting a short save look like a failed one.
    const aboutLength = form.about.trim().length;
    const aboutOk = aboutLength >= ABOUT_MIN_CHARS;

    if (!canEdit) {
        return (
            <section className="bg-white border border-gray-200/70 rounded-3xl p-6">
                <p className="text-sm text-gray-500">Your role doesn&rsquo;t include editing the storefront.</p>
            </section>
        );
    }

    return (
        <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6 space-y-4">
            <div>
                <h2 className="text-base font-bold text-ink">Your public page</h2>
                <p className="text-sm text-gray-500 mt-0.5">This is what someone sees before deciding to ask.</p>
            </div>

            <label className="block">
                <span className="text-sm font-semibold text-ink">One line about you</span>
                <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120}
                    className={`${FIELD} mt-1.5`} placeholder="We refit branches and pass on what still works." />
            </label>

            <label className="block">
                <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">About</span>
                    <span className={`text-xs tabular-nums ${aboutOk ? "text-primary" : "text-gray-400"}`}>
                        {aboutOk
                            ? `${aboutLength} characters`
                            : `${aboutLength} / ${ABOUT_MIN_CHARS} to finish setup`}
                    </span>
                </span>
                <textarea rows={6} value={form.about} onChange={(e) => set("about", e.target.value)}
                    className={`${FIELD} mt-1.5 resize-y font-mono text-[13px]`}
                    placeholder={"Markdown works here.\n\nWho you are, what you tend to list, and how quickly you reply."} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Logo URL</span>
                    <input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="https://…" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Cover image URL</span>
                    <input value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="https://…" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Website</span>
                    <input value={form.website} onChange={(e) => set("website", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="https://…" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Location</span>
                    <input value={form.locationName} onChange={(e) => set("locationName", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="Tema, Ghana" />
                </label>
            </div>

            <button
                onClick={() => run("front", () => updateStorefront(form))}
                disabled={busy === "front"}
                className="inline-flex items-center gap-2 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-6 py-3 rounded-full transition-colors disabled:opacity-50"
            >
                {busy === "front" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save page
            </button>
        </section>
    );
}

function Team({
    team, canManage, busy, run,
}: { team: MyOrg["team"]; canManage: boolean; busy: string | null; run: Run }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<OrgRole>("lister");

    return (
        <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
            <h2 className="text-base font-bold text-ink">Team</h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-4">
                Colleagues sign in as themselves. Nobody shares a password.
            </p>

            {canManage && (
                <div className="flex flex-wrap gap-2 mb-4">
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        aria-label="Colleague email"
                        className={`${FIELD} flex-1 min-w-[220px]`}
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as OrgRole)}
                        aria-label="Role"
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest"
                    >
                        {(Object.keys(ORG_ROLE_LABELS) as OrgRole[]).map((r) => (
                            <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => run("team", () => addTeamMember(email, role), () => setEmail(""))}
                        disabled={busy === "team" || !email.trim()}
                        className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-3 rounded-2xl transition-colors disabled:opacity-50"
                    >
                        {busy === "team" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>
                </div>
            )}

            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                {(Object.keys(ORG_ROLE_LABELS) as OrgRole[])
                    .map((r) => `${ORG_ROLE_LABELS[r]}: ${ORG_ROLE_BLURB[r]}`)
                    .join("  ")}
            </p>

            <ul className="divide-y divide-gray-100">
                {team.map((m) => (
                    <li key={m.uid} className="flex items-center gap-3 py-2.5">
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink truncate">{m.name || "Member"}</span>
                            <span className="block text-xs text-gray-400 truncate">{m.email}</span>
                        </span>
                        <span className="text-xs font-bold text-forest flex-shrink-0">{ORG_ROLE_LABELS[m.role]}</span>
                        {canManage && (
                            <button
                                onClick={() => {
                                    if (!window.confirm(`Remove ${m.name || m.email} from the team?`)) return;
                                    run("team", () => removeTeamMember(m.uid));
                                }}
                                className="text-gray-300 hover:text-red-500 flex-shrink-0"
                                aria-label="Remove"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
