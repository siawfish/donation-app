/**
 * Reactions, comments and polls — the parts of a post a reader can touch.
 *
 * The shapes live here rather than in the actions file so the editor, the
 * public page and the admin moderation screen all agree on them without any of
 * them importing a `'use server'` module for a type.
 */

/* ── Reactions ─────────────────────────────────────────────────────────── */

/**
 * A short, deliberately unambiguous set.
 *
 * A long emoji tray produces a spread of one-vote reactions that says nothing.
 * Five, each meaning a clearly different thing, gives a signal you can read at
 * a glance — and one of them ("Not for me") exists so disagreement has somewhere
 * to go other than the comments.
 */
export const REACTIONS = [
    { key: "clap", emoji: "👏", label: "Well said" },
    { key: "heart", emoji: "❤️", label: "Loved it" },
    { key: "idea", emoji: "💡", label: "Learned something" },
    { key: "pray", emoji: "🙏", label: "Grateful" },
    { key: "meh", emoji: "🤔", label: "Not for me" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];

export const REACTION_KEYS: ReactionKey[] = REACTIONS.map((r) => r.key);

export function isReactionKey(value: unknown): value is ReactionKey {
    return typeof value === "string" && (REACTION_KEYS as string[]).includes(value);
}

export interface ReactionSummary {
    /** Count per reaction key; keys with no reactions are omitted. */
    counts: Partial<Record<ReactionKey, number>>;
    total: number;
    /** What the signed-in reader picked, if anything. */
    mine: ReactionKey | null;
}

export const EMPTY_REACTIONS: ReactionSummary = { counts: {}, total: 0, mine: null };

/* ── Comments ──────────────────────────────────────────────────────────── */

export type CommentStatus = "visible" | "hidden";

export const COMMENT_MAX = 2000;

export interface BlogComment {
    id: string;
    postId: string;
    postSlug: string;
    body: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    /** Set on a reply. Threads are one level deep, on purpose — see below. */
    parentId?: string | null;
    status: CommentStatus;
    createdAt: string;
    updatedAt: string;
    editedAt?: string;
}

/** A top-level comment with its replies attached. */
export interface CommentThread {
    comment: BlogComment;
    replies: BlogComment[];
}

/**
 * Build threads from a flat list.
 *
 * Replies are capped at one level. Deeper nesting is unreadable on a phone,
 * which is where nearly all of this will be read, and it turns moderation into
 * a tree-surgery problem — deleting a comment eight deep orphans everything
 * under it.
 */
export function buildThreads(comments: BlogComment[]): CommentThread[] {
    const tops = comments.filter((c) => !c.parentId);
    const byParent = new Map<string, BlogComment[]>();

    for (const c of comments) {
        if (!c.parentId) continue;
        const list = byParent.get(c.parentId) ?? [];
        list.push(c);
        byParent.set(c.parentId, list);
    }

    return tops
        // Newest conversation first...
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((comment) => ({
            comment,
            // ...but replies read oldest-first, like a conversation.
            replies: (byParent.get(comment.id) ?? []).sort((a, b) =>
                a.createdAt.localeCompare(b.createdAt)
            ),
        }));
}

export function countComments(comments: BlogComment[]): number {
    return comments.filter((c) => c.status === "visible").length;
}

/**
 * Reject a comment before it costs a write.
 *
 * Returns an error string, or null when it is fine. Deliberately thin: this
 * blocks empty and oversized comments, not opinions.
 */
export function validateComment(body: string): string | null {
    const trimmed = (body ?? "").trim();
    if (trimmed.length < 2) return "Say a little more than that.";
    if (trimmed.length > COMMENT_MAX) return `Keep it under ${COMMENT_MAX} characters.`;
    return null;
}

/* ── Polls ─────────────────────────────────────────────────────────────── */

export const POLL_OPTION_MAX = 6;
export const POLL_OPTION_CHARS = 80;
export const POLL_QUESTION_CHARS = 160;

export interface PollOption {
    id: string;
    label: string;
}

export interface Poll {
    question: string;
    options: PollOption[];
    /** ISO date. After this, results show but voting is closed. */
    closesAt?: string;
}

export interface PollResults {
    poll: Poll;
    /** Votes per option id. */
    counts: Record<string, number>;
    total: number;
    /** The signed-in reader's option id, if they voted. */
    mine: string | null;
    closed: boolean;
}

export function pollClosed(poll: Poll): boolean {
    if (!poll.closesAt) return false;
    const at = Date.parse(poll.closesAt);
    return Number.isFinite(at) && at < Date.now();
}

export function pollPercent(counts: Record<string, number>, optionId: string, total: number): number {
    if (!total) return 0;
    return Math.round(((counts[optionId] ?? 0) / total) * 100);
}

/**
 * Check a poll before it is saved with a post.
 *
 * A poll with one option, or two options that say the same thing, is worse than
 * no poll — it reads as a broken page rather than a question.
 */
export function validatePoll(poll: Poll | null | undefined): string | null {
    if (!poll) return null;

    const question = (poll.question ?? "").trim();
    if (!question) return "The poll needs a question.";
    if (question.length > POLL_QUESTION_CHARS) return `Poll question must be under ${POLL_QUESTION_CHARS} characters.`;

    const labels = (poll.options ?? []).map((o) => (o.label ?? "").trim()).filter(Boolean);
    if (labels.length < 2) return "A poll needs at least two options.";
    if (labels.length > POLL_OPTION_MAX) return `A poll can have at most ${POLL_OPTION_MAX} options.`;
    if (labels.some((l) => l.length > POLL_OPTION_CHARS)) {
        return `Each option must be under ${POLL_OPTION_CHARS} characters.`;
    }
    if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
        return "Two options say the same thing.";
    }
    return null;
}

/** Stable option ids so votes survive an edit to the wording. */
export function nextOptionId(existing: PollOption[]): string {
    const used = new Set(existing.map((o) => o.id));
    for (let i = 1; i <= POLL_OPTION_MAX + 1; i++) {
        const id = `o${i}`;
        if (!used.has(id)) return id;
    }
    return `o${Date.now()}`;
}
