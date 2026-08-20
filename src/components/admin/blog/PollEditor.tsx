"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/admin/ui";
import {
    POLL_OPTION_CHARS, POLL_OPTION_MAX, POLL_QUESTION_CHARS,
    nextOptionId, validatePoll, type Poll,
} from "@/lib/blogSocial";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";

/**
 * Authoring for the optional poll attached to a post.
 *
 * Option ids are assigned once and never reused, so rewording an option keeps
 * the votes already cast for it. Deleting one deliberately discards its votes,
 * which is why the button says so.
 */
export function PollEditor({
    poll,
    onChange,
}: {
    poll: Poll | null | undefined;
    onChange: (poll: Poll | null) => void;
}) {
    const active = !!poll;
    const problem = poll ? validatePoll(poll) : null;

    const start = () =>
        onChange({ question: "", options: [{ id: "o1", label: "" }, { id: "o2", label: "" }] });

    const patch = (next: Partial<Poll>) => {
        if (!poll) return;
        onChange({ ...poll, ...next });
    };

    const setOption = (id: string, label: string) =>
        patch({ options: (poll?.options ?? []).map((o) => (o.id === id ? { ...o, label } : o)) });

    const addOption = () =>
        patch({
            options: [...(poll?.options ?? []), { id: nextOptionId(poll?.options ?? []), label: "" }],
        });

    const removeOption = (id: string) =>
        patch({ options: (poll?.options ?? []).filter((o) => o.id !== id) });

    if (!active) {
        return (
            <div>
                <p className="text-xs text-gray-500 leading-relaxed">
                    Ask readers one question. Results stay hidden until someone votes, so the
                    running tally can&rsquo;t sway the answer.
                </p>
                <Button variant="default" onClick={start} className="mt-3">
                    <Plus className="w-3.5 h-3.5" /> Add a poll
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <label className={LABEL}>Question</label>
                <Input
                    value={poll!.question}
                    onChange={(e) => patch({ question: e.target.value })}
                    maxLength={POLL_QUESTION_CHARS}
                    placeholder="What stops you passing things on?"
                    className="w-full mt-1"
                />
            </div>

            <div>
                <label className={LABEL}>Options</label>
                <ul className="space-y-2 mt-1">
                    {poll!.options.map((o, i) => (
                        <li key={o.id} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400 w-4 tabular-nums flex-shrink-0">
                                {i + 1}
                            </span>
                            <Input
                                value={o.label}
                                onChange={(e) => setOption(o.id, e.target.value)}
                                maxLength={POLL_OPTION_CHARS}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1"
                            />
                            {poll!.options.length > 2 && (
                                <button
                                    onClick={() => removeOption(o.id)}
                                    title="Remove this option and any votes it has"
                                    className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 p-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>

                {poll!.options.length < POLL_OPTION_MAX && (
                    <Button variant="ghost" onClick={addOption} className="mt-2">
                        <Plus className="w-3.5 h-3.5" /> Add option
                    </Button>
                )}
            </div>

            <div>
                <label className={LABEL}>Closes on (optional)</label>
                <Input
                    type="date"
                    value={poll!.closesAt ? poll!.closesAt.slice(0, 10) : ""}
                    onChange={(e) =>
                        patch({
                            closesAt: e.target.value
                                ? new Date(`${e.target.value}T23:59:59`).toISOString()
                                : undefined,
                        })
                    }
                    className="w-full mt-1"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                    After this, results show but voting stops.
                </p>
            </div>

            {problem && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-2">
                    {problem}
                </p>
            )}

            <Button variant="ghost" onClick={() => onChange(null)}>
                <Trash2 className="w-3.5 h-3.5" /> Remove poll
            </Button>
        </div>
    );
}
