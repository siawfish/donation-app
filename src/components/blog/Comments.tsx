"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addComment, deleteComment } from "@/app/app/actions/blogSocial";
import {
    COMMENT_MAX, buildThreads, countComments, validateComment,
    type BlogComment,
} from "@/lib/blogSocial";
import { getInitials } from "@/lib/utils";

const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all resize-y";

function when(iso: string) {
    if (!iso) return "";
    try {
        return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
        return "";
    }
}

function Avatar({ comment }: { comment: BlogComment }) {
    return (
        <span className="w-9 h-9 rounded-full bg-forest text-lime text-xs font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
            {comment.authorPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comment.authorPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
                getInitials(comment.authorName)
            )}
        </span>
    );
}

function Composer({
    onSubmit,
    busy,
    placeholder,
    autoFocus,
    onCancel,
}: {
    onSubmit: (body: string) => void;
    busy: boolean;
    placeholder: string;
    autoFocus?: boolean;
    onCancel?: () => void;
}) {
    const [body, setBody] = useState("");
    const problem = body.trim() ? validateComment(body) : null;

    return (
        <div>
            <textarea
                rows={3}
                value={body}
                autoFocus={autoFocus}
                onChange={(e) => setBody(e.target.value)}
                placeholder={placeholder}
                maxLength={COMMENT_MAX + 100}
                className={FIELD}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                <span className={`text-xs ${problem ? "text-amber-700" : "text-gray-400"}`}>
                    {problem ?? `${body.trim().length} / ${COMMENT_MAX}`}
                </span>
                <span className="flex items-center gap-2">
                    {onCancel && (
                        <button onClick={onCancel} className="text-xs font-bold text-gray-500 hover:text-ink px-3 py-2">
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => { onSubmit(body); setBody(""); }}
                        disabled={busy || !!problem || !body.trim()}
                        className="inline-flex items-center gap-2 bg-forest text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-forest-dark transition-colors disabled:opacity-50"
                    >
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Post
                    </button>
                </span>
            </div>
        </div>
    );
}

/**
 * The conversation under a post.
 *
 * Signed-in only. Anonymous comments on a platform whose whole premise is that
 * you are a real neighbour would be the one place on Givny where nobody has to
 * be anybody — and it is the place that most needs people to be accountable.
 */
export function Comments({
    postId,
    initial,
    signedIn,
    currentUid,
}: {
    postId: string;
    initial: BlogComment[];
    signedIn: boolean;
    currentUid: string | null;
}) {
    const [comments, setComments] = useState(initial);
    const [busy, startTransition] = useTransition();
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const threads = buildThreads(comments);
    const total = countComments(comments);

    const post = (body: string, parentId?: string | null) => {
        startTransition(async () => {
            const res = await addComment(postId, body, parentId ?? null);
            if (!res.success || !res.data) {
                toast.error(res.message);
                return;
            }
            setComments(res.data);
            setReplyTo(null);
        });
    };

    const remove = (id: string) => {
        startTransition(async () => {
            const res = await deleteComment(id);
            if (!res.success || !res.data) {
                toast.error(res.message);
                return;
            }
            setComments(res.data);
            toast.success("Deleted");
        });
    };

    const Row = ({ comment, isReply }: { comment: BlogComment; isReply?: boolean }) => (
        <div className={`flex gap-3 ${isReply ? "mt-4" : ""}`}>
            <Avatar comment={comment} />
            <div className="min-w-0 flex-1">
                <p className="text-sm">
                    <span className="font-bold text-ink">{comment.authorName}</span>
                    <span className="text-gray-400"> · {when(comment.createdAt)}</span>
                    {comment.status === "hidden" && (
                        <span className="ml-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2 py-0.5">
                            Hidden by a moderator — only you can see this
                        </span>
                    )}
                </p>

                <p className="text-[15px] text-ink leading-relaxed mt-1 whitespace-pre-line break-words">
                    {comment.body}
                </p>

                <div className="flex items-center gap-4 mt-1.5">
                    {!isReply && signedIn && (
                        <button
                            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-forest transition-colors"
                        >
                            <Reply className="w-3.5 h-3.5" /> Reply
                        </button>
                    )}
                    {currentUid === comment.authorId && (
                        <button
                            onClick={() => remove(comment.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <section id="comments" className="max-w-[720px] mx-auto px-4 pb-24">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-ink tracking-tight">
                <MessageCircle className="w-5 h-5 text-primary" />
                {total === 0 ? "Join the conversation" : `${total} ${total === 1 ? "comment" : "comments"}`}
            </h2>

            <div className="mt-5">
                {signedIn ? (
                    <Composer
                        onSubmit={(body) => post(body)}
                        busy={busy}
                        placeholder="Share what you think — kindly."
                    />
                ) : (
                    <div className="bg-sand border border-gray-200/70 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600">
                            Sign in to comment. Real names keep this place civil.
                        </p>
                        <button
                            onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)}
                            className="bg-forest text-lime text-sm font-bold px-5 py-2.5 rounded-full hover:brightness-110 transition-all"
                        >
                            Sign in
                        </button>
                    </div>
                )}
            </div>

            {threads.length > 0 && (
                <ul className="mt-9 space-y-8">
                    {threads.map(({ comment, replies }) => (
                        <li key={comment.id}>
                            <Row comment={comment} />

                            {replies.length > 0 && (
                                <div className="ml-6 md:ml-12 pl-4 border-l border-gray-200/70">
                                    {replies.map((r) => (
                                        <Row key={r.id} comment={r} isReply />
                                    ))}
                                </div>
                            )}

                            {replyTo === comment.id && (
                                <div className="ml-6 md:ml-12 pl-4 border-l border-gray-200/70 mt-4">
                                    <Composer
                                        autoFocus
                                        busy={busy}
                                        placeholder={`Reply to ${comment.authorName}`}
                                        onCancel={() => setReplyTo(null)}
                                        onSubmit={(body) => post(body, comment.id)}
                                    />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
