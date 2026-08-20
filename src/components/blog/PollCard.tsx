"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { votePoll } from "@/app/app/actions/blogSocial";
import { pollPercent, type PollResults } from "@/lib/blogSocial";

/**
 * A single-question poll attached to a post.
 *
 * Results stay hidden until the reader votes or the poll closes. Showing the
 * running tally first biases the answer — people pick the winning side — and
 * the point of asking is to learn something we didn't already know.
 */
export function PollCard({
    postId,
    initial,
    signedIn,
}: {
    postId: string;
    initial: PollResults;
    signedIn: boolean;
}) {
    const [results, setResults] = useState(initial);
    const [busy, startTransition] = useTransition();
    const [pending, setPending] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const { poll, counts, total, mine, closed } = results;
    const revealed = !!mine || closed;

    const vote = (optionId: string) => {
        if (!signedIn) {
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }
        if (closed) return;

        setPending(optionId);
        startTransition(async () => {
            const res = await votePoll(postId, optionId);
            setPending(null);
            if (!res.success || !res.data) {
                toast.error(res.message);
                return;
            }
            setResults(res.data);
        });
    };

    return (
        <section className="not-prose bg-sand border border-gray-200/70 rounded-3xl p-5 md:p-6 my-10">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-forest mb-2.5">
                <BarChart3 className="w-3.5 h-3.5" /> {closed ? "Poll closed" : "Your turn"}
            </p>

            <h3 className="text-lg md:text-xl font-bold text-ink tracking-tight leading-snug">
                {poll.question}
            </h3>

            <ul className="space-y-2 mt-4">
                {poll.options.map((o) => {
                    const percent = pollPercent(counts, o.id, total);
                    const isMine = mine === o.id;

                    return (
                        <li key={o.id}>
                            <button
                                onClick={() => vote(o.id)}
                                disabled={busy || closed}
                                aria-pressed={isMine}
                                className={`relative w-full text-left overflow-hidden rounded-2xl border transition-all ${
                                    isMine ? "border-forest" : "border-gray-200 hover:border-forest/40"
                                } ${closed ? "cursor-default" : "cursor-pointer"} bg-white disabled:cursor-default`}
                            >
                                {/* The result bar sits behind the label rather than
                                    beside it, so the row reads the same before and
                                    after voting and nothing jumps. */}
                                {revealed && (
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                            isMine ? "bg-lime/60" : "bg-gray-100"
                                        }`}
                                        style={{ width: `${percent}%` }}
                                    />
                                )}

                                <span className="relative flex items-center justify-between gap-3 px-4 py-3">
                                    <span className="inline-flex items-center gap-2 min-w-0">
                                        {pending === o.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-forest flex-shrink-0" />
                                        ) : isMine ? (
                                            <Check className="w-3.5 h-3.5 text-forest flex-shrink-0" />
                                        ) : null}
                                        <span className={`text-sm truncate ${isMine ? "font-bold text-ink" : "text-ink"}`}>
                                            {o.label}
                                        </span>
                                    </span>

                                    {revealed && (
                                        <span className="text-sm font-bold text-forest tabular-nums flex-shrink-0">
                                            {percent}%
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="text-xs text-gray-500 mt-3">
                {total === 0
                    ? "No votes yet — be the first."
                    : `${total} ${total === 1 ? "vote" : "votes"}`}
                {!revealed && total > 0 && " · vote to see the results"}
                {!signedIn && " · sign in to vote"}
            </p>
        </section>
    );
}
