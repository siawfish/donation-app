"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { firestore } from "@/firebase/auth/firebase";
import { useAuth } from "@/firebase/auth/AuthContext";

/** Deterministic doc id — a block is an existence check, not a query, and the
 *  same pair can never end up with two rows. */
function blockDocId(blockerId: string, blockedId: string): string {
    return `${blockerId}_${blockedId}`;
}

/**
 * Whether either side of a conversation has blocked the other. Checked both
 * ways: a block only has to be one-directional to end the conversation —
 * either "I don't want to hear from them" or "they don't want to hear from
 * me" is reason enough to stop new messages going either direction.
 */
export function useBlockStatus(otherUserId?: string) {
    const { user } = useAuth();
    const [blockedByMe, setBlockedByMe] = useState(false);
    const [blockedMe, setBlockedMe] = useState(false);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        if (!user || !otherUserId) { setLoading(false); return; }
        try {
            const [mine, theirs] = await Promise.all([
                getDoc(doc(firestore, "blocks", blockDocId(user.uid, otherUserId))),
                getDoc(doc(firestore, "blocks", blockDocId(otherUserId, user.uid))),
            ]);
            setBlockedByMe(mine.exists());
            setBlockedMe(theirs.exists());
        } catch {
            // A failed check just leaves messaging open — not worth a toast.
        } finally {
            setLoading(false);
        }
    }, [user, otherUserId]);

    useEffect(() => { check() }, [check]);

    const block = async () => {
        if (!user || !otherUserId) return;
        try {
            await setDoc(doc(firestore, "blocks", blockDocId(user.uid, otherUserId)), {
                blockerId: user.uid,
                blockedId: otherUserId,
                createdAt: new Date().toISOString(),
            });
            setBlockedByMe(true);
            toast.success("Blocked");
        } catch {
            toast.error("Couldn't block — try again in a moment.");
        }
    };

    const unblock = async () => {
        if (!user || !otherUserId) return;
        try {
            await deleteDoc(doc(firestore, "blocks", blockDocId(user.uid, otherUserId)));
            setBlockedByMe(false);
            toast.success("Unblocked");
        } catch {
            toast.error("Couldn't unblock — try again in a moment.");
        }
    };

    return { blockedByMe, blockedMe, blocked: blockedByMe || blockedMe, loading, block, unblock };
}
