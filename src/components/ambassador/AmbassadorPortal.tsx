"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
    Copy, Check, Loader2, Plus, Share2, Trash2, Trophy, Users, Sparkles,
    MessageSquare, Megaphone, X,
} from "lucide-react";
import { toast } from "sonner";
import {
    ambassadorStandings, deleteMyActivity, getMyAmbassadorship, logActivity,
    type AmbassadorDetail,
} from "@/app/app/actions/ambassadors";
import {
    ACTIVITY_LABELS, ActivityKind, HEALTH_LABELS, healthOf, displayCode,
    progressPct, referralUrl,
} from "@/lib/ambassadors";
import { todayISO } from "@/lib/crm";
import { PUBLIC_SITE_URL as SITE } from "@/lib/seo";


/** Ring showing progress toward a monthly target. */
function Ring({ label, actual, target }: { label: string; actual: number; target: number }) {
    const pct = progressPct(actual, target);
    const r = 30;
    const c = 2 * Math.PI * r;
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-[76px] h-[76px]">
                <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
                    <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
                    <circle
                        cx="38" cy="38" r={r} fill="none"
                        stroke={pct >= 100 ? "#D9F36E" : "#ffffff"}
                        strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
                        className="transition-all duration-700"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg tabular-nums">
                    {actual}
                </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lime mt-2">{label}</span>
            <span className="text-[11px] text-white/50 tabular-nums">of {target}</span>
        </div>
    );
}

export function AmbassadorPortal({ initial }: { initial: AmbassadorDetail }) {
    const [data, setData] = useState(initial);
    const [standings, setStandings] = useState<{ uid: string; name: string; territory: string; signups30d: number }[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [logging, setLogging] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const a = data.ambassador;
    const k = data.kpis;
    const link = referralUrl(a.uid, SITE);
    const code = displayCode(a.uid, a.territory);

    useEffect(() => { ambassadorStandings().then((r) => setStandings(r.data)) }, []);

    const refresh = useCallback(async () => {
        const res = await getMyAmbassadorship();
        if (res.success && res.data) setData(res.data);
    }, []);

    const copy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(null), 1800);
        } catch {
            toast.error("Couldn't copy — select the text instead.");
        }
    };

    /** Ready-made messages, because "share it" is not a tool. */
    const templates = useMemo(() => [
        {
            id: "whatsapp",
            icon: MessageSquare,
            label: "WhatsApp / status",
            text: `Moving out or clearing your room? Don't throw it away — someone near you needs it.\n\nGivny is free. List what you're done with, or take what you need. No selling, no haggling.\n\n${link}`,
        },
        {
            id: "group",
            icon: Megaphone,
            label: "Hall or community group",
            text: `Quick one for the group 👋\n\nI'm running Givny in ${a.territory}. It's a free marketplace — people pass on things they no longer need to neighbours who do. Furniture, kettles, baby things, books.\n\nNothing is for sale. If you're clearing out, list it. If you need something, ask.\n\n${link}`,
        },
        {
            id: "poster",
            icon: Sparkles,
            label: "Poster / flyer line",
            text: `FREE — not for sale.\nGive what you're done with. Take what you need.\nGivny · ${a.territory}\nJoin: ${link}\nCode: ${code}`,
        },
    ], [link, code, a.territory]);

    const myRank = standings.findIndex((s) => s.uid === a.uid) + 1;

    return (
        <div className="space-y-5">
            {/* Standing */}
            <section className="forest-panel rounded-3xl p-6 md:p-8 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-lime mb-1.5">
                            {a.type === "campus" ? "Campus" : "Community"} ambassador
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{a.territory}</h1>
                        <p className="text-white/60 text-sm mt-1">
                            {k.signups} member{k.signups === 1 ? "" : "s"} joined through you
                            {myRank > 0 && standings.length > 1 && ` · ranked #${myRank} of ${standings.length}`}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs font-bold">
                        {HEALTH_LABELS[healthOf(k, a.targets)]} this month
                    </span>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-8 mt-7">
                    <Ring label="Signups" actual={k.signups30d} target={a.targets.signups} />
                    <Ring label="Activated" actual={k.activations30d} target={a.targets.activations} />
                    <Ring label="Handovers" actual={k.handovers30d} target={a.targets.handovers} />
                </div>

                <p className="text-[11px] text-white/40 mt-5 leading-relaxed max-w-lg">
                    Activated means they went on to list something or ask for something. That is the number
                    that counts — an account that never does anything is not growth.
                </p>
            </section>

            {/* The link */}
            <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                <h2 className="text-base font-bold text-ink">Your link</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Anyone who signs up through this is counted to you automatically. No codes to type.
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                    <code className="flex-1 min-w-[220px] text-[13px] text-ink bg-sand border border-gray-200 rounded-2xl px-4 py-3 break-all">
                        {link}
                    </code>
                    <button
                        onClick={() => copy(link, "link")}
                        className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-3 rounded-2xl transition-colors"
                    >
                        {copied === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "link" ? "Copied" : "Copy"}
                    </button>
                    {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                            onClick={() => navigator.share?.({ title: "Givny", text: "Free stuff from neighbours near you", url: link }).catch(() => {})}
                            className="inline-flex items-center gap-1.5 border border-gray-200 text-ink text-sm font-bold px-5 py-3 rounded-2xl hover:border-forest/40 transition-colors"
                        >
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-400 mt-3">
                    Say it out loud as <span className="font-bold text-ink">{code}</span> — but the link is what tracks.
                </p>
            </section>

            {/* Toolkit */}
            <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                <h2 className="text-base font-bold text-ink">Say it like this</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Written for you. Copy, adjust it to sound like you, and send.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    {templates.map((t) => (
                        <div key={t.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col">
                            <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                                <t.icon className="w-4 h-4 text-primary" /> {t.label}
                            </p>
                            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed mt-2 flex-1 line-clamp-6">
                                {t.text}
                            </p>
                            <button
                                onClick={() => copy(t.text, t.id)}
                                className="mt-3 inline-flex items-center justify-center gap-1.5 border border-gray-200 text-ink text-xs font-bold px-3 py-2 rounded-full hover:border-forest/40 transition-colors"
                            >
                                {copied === t.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied === t.id ? "Copied" : "Copy"}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
                {/* Work log */}
                <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-ink">Your work</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Log what you did. Your signups are counted automatically — this is for
                                the work that doesn&rsquo;t show up as a number.
                            </p>
                        </div>
                        <button
                            onClick={() => setLogging((v) => !v)}
                            className="inline-flex items-center gap-1.5 bg-lime text-forest text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all flex-shrink-0"
                        >
                            {logging ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {logging ? "Cancel" : "Log"}
                        </button>
                    </div>

                    {logging && <LogForm onDone={() => { setLogging(false); refresh(); }} />}

                    <ul className="mt-4 space-y-2">
                        {data.activities.length === 0 && (
                            <li className="text-sm text-gray-400">Nothing logged yet.</li>
                        )}
                        {data.activities.map((act) => (
                            <li key={act.id} className="flex items-start gap-3 border border-gray-200 rounded-2xl px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-ink">{act.title}</p>
                                    {act.detail && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{act.detail}</p>}
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        {ACTIVITY_LABELS[act.kind]} · {act.occurredOn}
                                        {act.reach ? ` · about ${act.reach} people` : ""}
                                        {act.reviewedAt && " · seen by the team"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!window.confirm("Remove this entry?")) return;
                                        setBusy(act.id!);
                                        startTransition(async () => {
                                            const res = await deleteMyActivity(act.id!);
                                            setBusy(null);
                                            if (!res.success) { toast.error(res.message); return; }
                                            refresh();
                                        });
                                    }}
                                    className="text-gray-300 hover:text-red-500 flex-shrink-0"
                                    aria-label="Remove entry"
                                >
                                    {busy === act.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="space-y-5 min-w-0">
                    {/* Standings */}
                    <section className="bg-white border border-gray-200/70 rounded-3xl p-5">
                        <h2 className="text-base font-bold text-ink flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-primary" /> Standings
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">Signups in the last 30 days.</p>
                        <ol className="space-y-1.5">
                            {standings.slice(0, 8).map((s, i) => (
                                <li
                                    key={s.uid}
                                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${
                                        s.uid === a.uid ? "bg-lime/30 border border-lime" : ""
                                    }`}
                                >
                                    <span className="w-5 text-xs font-bold text-gray-400 tabular-nums">{i + 1}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-ink truncate">
                                            {s.uid === a.uid ? "You" : s.name}
                                        </span>
                                        <span className="block text-[11px] text-gray-400 truncate">{s.territory}</span>
                                    </span>
                                    <span className="text-sm font-bold text-ink tabular-nums">{s.signups30d}</span>
                                </li>
                            ))}
                            {standings.length === 0 && <li className="text-sm text-gray-400">No standings yet.</li>}
                        </ol>
                    </section>

                    {/* Who joined */}
                    <section className="bg-white border border-gray-200/70 rounded-3xl p-5">
                        <h2 className="text-base font-bold text-ink flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Who joined
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">
                            {data.referred.filter((r) => r.activated).length} of {data.referred.length} have
                            listed or asked for something.
                        </p>
                        <ul className="space-y-1.5">
                            {data.referred.slice(0, 8).map((m) => (
                                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-ink truncate">{m.name || "New member"}</span>
                                    <span className={`text-[11px] font-bold flex-shrink-0 ${m.activated ? "text-primary" : "text-gray-300"}`}>
                                        {m.activated ? "active" : "quiet"}
                                    </span>
                                </li>
                            ))}
                            {data.referred.length === 0 && (
                                <li className="text-sm text-gray-400">Nobody yet. Share your link to start.</li>
                            )}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}

function LogForm({ onDone }: { onDone: () => void }) {
    const [kind, setKind] = useState<ActivityKind>("event");
    const [title, setTitle] = useState("");
    const [detail, setDetail] = useState("");
    const [reach, setReach] = useState("");
    const [occurredOn, setOccurredOn] = useState(todayISO());
    const [busy, setBusy] = useState(false);
    const [, startTransition] = useTransition();

    const submit = () => {
        setBusy(true);
        startTransition(async () => {
            const res = await logActivity({
                kind, title, detail, reach: Number(reach) || 0, occurredOn,
            });
            setBusy(false);
            if (!res.success) { toast.error(res.message); return; }
            toast.success("Logged — the team can see it");
            onDone();
        });
    };

    return (
        <div className="mt-4 border border-gray-200 rounded-2xl p-4 bg-sand/40 space-y-2.5">
            <div className="flex flex-wrap gap-2">
                <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ActivityKind)}
                    aria-label="Kind of work"
                    className="bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-ink outline-none focus:border-forest"
                >
                    {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input
                    type="date"
                    value={occurredOn}
                    max={todayISO()}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    aria-label="Date"
                    className="bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-ink outline-none focus:border-forest"
                />
                <input
                    value={reach}
                    onChange={(e) => setReach(e.target.value.replace(/\D/g, ""))}
                    placeholder="People reached"
                    inputMode="numeric"
                    aria-label="People reached"
                    className="bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-ink outline-none focus:border-forest w-40"
                />
            </div>
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Stand at Republic Hall during move-in"
                aria-label="What did you do"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-ink outline-none focus:border-forest"
            />
            <textarea
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Anything the team should know — what worked, what didn't"
                aria-label="Detail"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-ink outline-none focus:border-forest resize-y"
            />
            <div className="flex justify-end">
                <button
                    onClick={submit}
                    disabled={busy || !title.trim()}
                    className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                </button>
            </div>
        </div>
    );
}
