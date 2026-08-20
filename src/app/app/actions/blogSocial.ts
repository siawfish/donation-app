"use server";

/**
 * Reader interaction on blog posts: reactions, comments and poll votes.
 *
 * Everything is server-side. The obvious alternative — let the browser write to
 * Firestore under rules — fails here for a specific reason: all three of these
 * are one-per-person, and "one per person" is a constraint about a *set* of
 * documents, which security rules cannot express without a denormalised counter
 * that anyone can then forge. Deterministic document ids plus an authenticated
 * server write gets it exactly right for free.
 */

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { revalidatePath } from "next/cache";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import {
    BlogComment, EMPTY_REACTIONS, Poll, PollResults, ReactionKey, ReactionSummary,
    isReactionKey, pollClosed, validateComment,
} from "@/lib/blogSocial";

const POSTS = "blogPosts";
const COMMENTS = "blogComments";
const REACTIONS_COL = "blogReactions";
const VOTES = "blogPollVotes";
const USERS = "users";

const iso = () => new Date().toISOString();

async function currentUid(): Promise<string | null> {
    const tokens = await getTokens(await cookies(), authConfig);
    return tokens?.decodedToken.uid ?? null;
}

/** Name and photo for a comment, read server-side so neither can be spoofed. */
async function authorProfile(uid: string): Promise<{ name: string; photo?: string }> {
    try {
        const snap = await db.collection(USERS).doc(uid).get();
        const d = snap.data();
        return { name: d?.name || "Someone", photo: d?.profileUrl || undefined };
    } catch {
        return { name: "Someone" };
    }
}

async function requireBlogAdmin(): Promise<string> {
    const uid = await currentUid();
    if (!uid) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) throw new Error("You don't have permission to moderate comments.");
    return uid;
}

/* ── Reactions ─────────────────────────────────────────────────────────── */

const reactionId = (postId: string, uid: string) => `${postId}_${uid}`;

export async function getReactions(postId: string): Promise<ReactionSummary> {
    try {
        const uid = await currentUid();
        const snap = await db.collection(REACTIONS_COL).where("postId", "==", postId).get();

        const counts: Partial<Record<ReactionKey, number>> = {};
        let mine: ReactionKey | null = null;

        for (const doc of snap.docs) {
            const d = doc.data();
            if (!isReactionKey(d.reaction)) continue;
            counts[d.reaction] = (counts[d.reaction] ?? 0) + 1;
            if (uid && d.uid === uid) mine = d.reaction;
        }

        return { counts, total: snap.size, mine };
    } catch {
        return { ...EMPTY_REACTIONS };
    }
}

/**
 * Set or clear this reader's reaction.
 *
 * Passing the reaction they already hold clears it, so the same tap toggles —
 * which is what every reader expects and saves a separate "remove" affordance.
 */
export async function setReaction(
    postId: string,
    reaction: string | null
): Promise<ResponseData<ReactionSummary | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Sign in to react.");

        const post = await db.collection(POSTS).doc(postId).get();
        if (!post.exists || post.data()?.status !== "published") {
            throw new Error("That post isn't available.");
        }

        const ref = db.collection(REACTIONS_COL).doc(reactionId(postId, uid));

        if (reaction === null) {
            await ref.delete();
        } else {
            if (!isReactionKey(reaction)) throw new Error("Unknown reaction.");
            const existing = await ref.get();
            if (existing.exists && existing.data()?.reaction === reaction) {
                await ref.delete();                       // same tap twice = undo
            } else {
                await ref.set({ postId, uid, reaction, createdAt: iso() });
            }
        }

        return { success: true, message: "Thanks", data: await getReactions(postId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Comments ──────────────────────────────────────────────────────────── */

function toComment(id: string, d: FirebaseFirestore.DocumentData): BlogComment {
    return {
        id,
        postId: d.postId,
        postSlug: d.postSlug ?? "",
        body: d.body ?? "",
        authorId: d.authorId,
        authorName: d.authorName ?? "Someone",
        authorPhoto: d.authorPhoto || undefined,
        parentId: d.parentId ?? null,
        status: d.status === "hidden" ? "hidden" : "visible",
        createdAt: d.createdAt ?? "",
        updatedAt: d.updatedAt ?? "",
        editedAt: d.editedAt || undefined,
    };
}

/**
 * Comments for a post, newest thread first.
 *
 * Hidden comments are dropped for everyone except their own author, who still
 * sees their own — a comment that vanishes without trace invites the author to
 * post it again, and again.
 */
export async function listComments(postId: string): Promise<BlogComment[]> {
    try {
        const uid = await currentUid();
        const snap = await db.collection(COMMENTS).where("postId", "==", postId).get();

        return snap.docs
            .map((d) => toComment(d.id, d.data()))
            .filter((c) => c.status === "visible" || c.authorId === uid)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
        return [];
    }
}

export async function addComment(
    postId: string,
    body: string,
    parentId?: string | null
): Promise<ResponseData<BlogComment[] | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Sign in to join the conversation.");

        const invalid = validateComment(body);
        if (invalid) throw new Error(invalid);

        const post = await db.collection(POSTS).doc(postId).get();
        if (!post.exists || post.data()?.status !== "published") {
            throw new Error("That post isn't available.");
        }

        // A reply must attach to a real, visible, top-level comment on this
        // same post — otherwise a crafted parentId could smuggle a reply onto
        // another post, or build a thread deeper than the UI can render.
        let parent: string | null = null;
        if (parentId) {
            const p = await db.collection(COMMENTS).doc(parentId).get();
            const pd = p.data();
            if (!p.exists || pd?.postId !== postId || pd?.status === "hidden") {
                throw new Error("That comment is no longer there.");
            }
            parent = pd?.parentId ? (pd.parentId as string) : parentId;
        }

        const profile = await authorProfile(uid);
        const now = iso();

        await db.collection(COMMENTS).add({
            postId,
            postSlug: post.data()?.slug ?? "",
            body: body.trim(),
            authorId: uid,
            authorName: profile.name,
            ...(profile.photo ? { authorPhoto: profile.photo } : {}),
            parentId: parent,
            status: "visible",
            createdAt: now,
            updatedAt: now,
        });

        revalidatePath(`/blog/${post.data()?.slug}`);
        return { success: true, message: "Posted", data: await listComments(postId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Delete your own comment. Admins use `setCommentHidden` instead, which keeps it. */
export async function deleteComment(commentId: string): Promise<ResponseData<BlogComment[] | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Unauthorized");

        const ref = db.collection(COMMENTS).doc(commentId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Already gone.");

        const d = snap.data()!;
        if (d.authorId !== uid) throw new Error("That isn't yours to delete.");

        await ref.delete();
        // Replies to a deleted comment would be answers to nothing.
        const replies = await db.collection(COMMENTS).where("parentId", "==", commentId).get();
        await Promise.all(replies.docs.map((r) => r.ref.delete()));

        revalidatePath(`/blog/${d.postSlug}`);
        return { success: true, message: "Deleted", data: await listComments(d.postId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Hide or restore a comment as a moderator.
 *
 * Hiding rather than deleting, and writing it to the audit log, so moderation
 * is reversible and attributable. A moderator who can silently erase criticism
 * is a moderator nobody can check.
 */
export async function setCommentHidden(
    commentId: string,
    hidden: boolean
): Promise<ResponseData<null>> {
    try {
        const actor = await requireBlogAdmin();

        const ref = db.collection(COMMENTS).doc(commentId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Not found");
        const d = snap.data()!;

        await ref.update({ status: hidden ? "hidden" : "visible", updatedAt: iso() });

        await recordAudit({
            action: hidden ? "comment.hide" : "comment.restore",
            targetId: commentId,
            targetLabel: `${d.authorName} on ${d.postSlug}`,
            detail: (d.body ?? "").slice(0, 200),
        });

        revalidatePath(`/blog/${d.postSlug}`);
        revalidatePath("/app/admin/blog/comments");
        void actor;
        return { success: true, message: hidden ? "Hidden" : "Restored", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export interface ModeratedComment extends BlogComment {
    postTitle: string;
}

/** Every comment across every post, newest first, for the moderation screen. */
export async function listAllComments(): Promise<ResponseData<ModeratedComment[]>> {
    try {
        await requireBlogAdmin();

        const snap = await db.collection(COMMENTS).get();
        const comments = snap.docs.map((d) => toComment(d.id, d.data()));

        // One read per post rather than per comment.
        const postIds = Array.from(new Set(comments.map((c) => c.postId)));
        const titles = new Map<string, string>();
        await Promise.all(
            postIds.map(async (id) => {
                const p = await db.collection(POSTS).doc(id).get();
                titles.set(id, p.data()?.title ?? "(deleted post)");
            })
        );

        return {
            success: true,
            message: "ok",
            data: comments
                .map((c) => ({ ...c, postTitle: titles.get(c.postId) ?? "" }))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/* ── Polls ─────────────────────────────────────────────────────────────── */

const voteId = (postId: string, uid: string) => `${postId}_${uid}`;

export async function getPollResults(postId: string): Promise<PollResults | null> {
    try {
        const post = await db.collection(POSTS).doc(postId).get();
        const poll = post.data()?.poll as Poll | undefined;
        if (!poll || !poll.options?.length) return null;

        const uid = await currentUid();
        const snap = await db.collection(VOTES).where("postId", "==", postId).get();

        const counts: Record<string, number> = {};
        let mine: string | null = null;
        for (const doc of snap.docs) {
            const d = doc.data();
            counts[d.optionId] = (counts[d.optionId] ?? 0) + 1;
            if (uid && d.uid === uid) mine = d.optionId;
        }

        return { poll, counts, total: snap.size, mine, closed: pollClosed(poll) };
    } catch {
        return null;
    }
}

export async function votePoll(
    postId: string,
    optionId: string
): Promise<ResponseData<PollResults | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Sign in to vote.");

        const post = await db.collection(POSTS).doc(postId).get();
        if (!post.exists || post.data()?.status !== "published") {
            throw new Error("That post isn't available.");
        }

        const poll = post.data()?.poll as Poll | undefined;
        if (!poll) throw new Error("There's no poll here.");
        if (pollClosed(poll)) throw new Error("This poll has closed.");
        if (!poll.options.some((o) => o.id === optionId)) throw new Error("Unknown option.");

        // Keyed by person, so changing your mind moves your vote rather than
        // adding a second one.
        await db.collection(VOTES).doc(voteId(postId, uid)).set({
            postId,
            uid,
            optionId,
            createdAt: iso(),
        });

        return { success: true, message: "Voted", data: await getPollResults(postId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
