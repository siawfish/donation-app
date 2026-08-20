"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { setReaction } from "@/app/app/actions/blogSocial";
import { REACTIONS, type ReactionKey, type ReactionSummary } from "@/lib/blogSocial";

/**
 * How the post landed.
 *
 * Counts are shown from the first reaction rather than hidden behind a
 * threshold: a zero next to every option tells a reader nobody has reacted,
 * which is honest and, on a young blog, still true.
 */
export function ReactionBar({
    postId,
    initial,
    signedIn,
}: {
    postId: string;
    initial: ReactionSummary;
    signedIn: boolean;
}) {
    const [state, setState] = useState(initial);
    const [busy, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();

    const pick = (key: ReactionKey) => {
        if (!signedIn) {
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        const wasMine = state.mine === key;
        const previous = state;

        // Optimistic: move the count off the old choice and onto the new one.
        const counts = { ...state.counts };
        if (state.mine) counts[state.mine] = Math.max(0, (counts[state.mine] ?? 1) - 1);
        if (!wasMine) counts[key] = (counts[key] ?? 0) + 1;

        setState({
            counts,
            total: Object.values(counts).reduce((a, b) => a + (b ?? 0), 0),
            mine: wasMine ? null : key,
        });

        startTransition(async () => {
            const res = await setReaction(postId, key);
            if (!res.success || !res.data) {
                setState(previous);
                toast.error(res.message);
                return;
            }
            setState(res.data);
        });
    };

    return (
        <div className="border-y border-gray-200/70 py-5 my-10">
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">
                How did this land?
            </p>

            <div className="flex flex-wrap gap-2">
                {REACTIONS.map((r) => {
                    const count = state.counts[r.key] ?? 0;
                    const mine = state.mine === r.key;
                    return (
                        <button
                            key={r.key}
                            onClick={() => pick(r.key)}
                            disabled={busy}
                            aria-pressed={mine}
                            title={r.label}
                            className={`inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-full border transition-all disabled:opacity-60 ${
                                mine
                                    ? "bg-forest text-lime border-forest"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                            }`}
                        >
                            <span aria-hidden="true" className="text-base leading-none">{r.emoji}</span>
                            <span className="hidden sm:inline">{r.label}</span>
                            {count > 0 && <span className="tabular-nums text-xs opacity-70">{count}</span>}
                        </button>
                    );
                })}
            </div>

            {state.total > 0 && (
                <p className="text-xs text-gray-400 mt-3 tabular-nums">
                    {state.total} {state.total === 1 ? "reader has" : "readers have"} reacted
                </p>
            )}
        </div>
    );
}
