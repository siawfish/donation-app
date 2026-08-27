"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitContactMessage } from "@/app/app/actions/contact";
import {
    MESSAGE_MAX, TOPIC_BLURB, TOPIC_LABELS, type ContactTopic, validateContact,
} from "@/lib/contact";

const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all";

const TOPICS = Object.keys(TOPIC_LABELS) as ContactTopic[];

/**
 * The contact form.
 *
 * Topic first, because it changes what we tell them next — someone who wants to
 * list an organisation should be sent to the application form rather than made
 * to write a message and wait for a reply.
 */
export function ContactForm({ initialTopic }: { initialTopic?: ContactTopic }) {
    const pathname = usePathname();
    const [pending, startTransition] = useTransition();
    const [sent, setSent] = useState(false);

    const [form, setForm] = useState({
        topic: initialTopic ?? ("support" as ContactTopic),
        name: "",
        email: "",
        phone: "",
        message: "",
        website: "", // honeypot
    });

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const problem = form.name || form.email || form.message ? validateContact(form) : null;
    const remaining = MESSAGE_MAX - form.message.trim().length;

    const submit = () => {
        const invalid = validateContact(form);
        if (invalid) { toast.error(invalid); return; }

        startTransition(async () => {
            const res = await submitContactMessage({ ...form, fromPath: pathname });
            if (!res.success) { toast.error(res.message); return; }
            setSent(true);
            toast.success("Message sent");
        });
    };

    if (sent) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 md:p-10 text-center">
                <span className="w-14 h-14 rounded-full bg-lime flex items-center justify-center mx-auto">
                    <Check className="w-7 h-7 text-forest" />
                </span>
                <h2 className="text-2xl font-bold text-ink tracking-tight mt-5">Message sent</h2>
                <p className="text-base text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    We read everything that comes in and reply to{" "}
                    <span className="font-semibold text-ink">{form.email}</span>, usually within
                    two working days.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 bg-forest text-lime text-sm font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all"
                    >
                        Browse what&rsquo;s nearby <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={() => { setSent(false); setForm((f) => ({ ...f, message: "" })); }}
                        className="text-sm font-bold text-gray-500 hover:text-forest transition-colors px-3 py-3"
                    >
                        Send another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-8">
            <fieldset>
                <legend className="text-sm font-semibold text-ink">What&rsquo;s this about?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {TOPICS.map((topic) => {
                        const active = form.topic === topic;
                        return (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => set("topic", topic)}
                                aria-pressed={active}
                                className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                                    active
                                        ? "border-forest bg-forest text-white"
                                        : "border-gray-200 hover:border-forest/40"
                                }`}
                            >
                                <span className={`block text-sm font-bold ${active ? "text-white" : "text-ink"}`}>
                                    {TOPIC_LABELS[topic]}
                                </span>
                                <span className={`block text-xs mt-0.5 leading-snug ${active ? "text-white/70" : "text-gray-500"}`}>
                                    {TOPIC_BLURB[topic]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* Some topics have a better answer than "write to us and wait". */}
            {form.topic === "organisation" && (
                <p className="text-sm text-gray-600 bg-sand rounded-2xl px-4 py-3 mt-3 leading-relaxed">
                    You can apply directly — it takes about five minutes and skips the queue.{" "}
                    <Link href="/for-organisations" className="font-bold text-forest hover:underline">
                        Apply to list
                    </Link>
                </p>
            )}
            {form.topic === "support" && (
                <p className="text-sm text-gray-600 bg-sand rounded-2xl px-4 py-3 mt-3 leading-relaxed">
                    If it&rsquo;s about a specific item or request, tell us the name of the item —
                    it saves a round trip.
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Your name</span>
                    <input
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        autoComplete="name"
                        className={`${FIELD} mt-1.5`}
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-semibold text-ink">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                        className={`${FIELD} mt-1.5`}
                    />
                    <span className="block text-xs text-gray-400 mt-1">This is where we&rsquo;ll reply.</span>
                </label>

                <label className="block sm:col-span-2">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">Phone</span>
                        <span className="text-xs text-gray-400">Optional</span>
                    </span>
                    <input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="For anything quicker settled by a call"
                        className={`${FIELD} mt-1.5`}
                    />
                </label>

                <label className="block sm:col-span-2">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">Message</span>
                        <span className={`text-xs tabular-nums ${remaining < 0 ? "text-amber-700" : "text-gray-400"}`}>
                            {remaining < 200 ? `${remaining} left` : ""}
                        </span>
                    </span>
                    <textarea
                        rows={6}
                        value={form.message}
                        onChange={(e) => set("message", e.target.value)}
                        placeholder="What&rsquo;s happening?"
                        className={`${FIELD} mt-1.5 resize-y`}
                    />
                </label>
            </div>

            {/* Honeypot. Hidden from people, irresistible to scripts. */}
            <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
            />

            {problem && (
                <p className="text-sm text-amber-700 mt-4">{problem}</p>
            )}

            <button
                onClick={submit}
                disabled={pending || !!problem || !form.message.trim()}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-forest text-lime font-bold px-7 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50 mt-6"
            >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send message
            </button>

            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                We use what you send only to answer you. Nothing here is published.
            </p>
        </div>
    );
}
