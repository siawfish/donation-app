"use client";

import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { firestore } from "@/firebase/auth/firebase";
import { useAuth } from "@/firebase/auth/AuthContext";
import { FirebaseErrors } from "@/firebase/errors";
import { ActivityAction } from "@/app/types";

/**
 * The save/favourite toggle, lifted out of the grid card (`image-card.tsx`)
 * so the item detail page can offer the same action without re-deriving the
 * Firestore queries and activity write.
 */
export function useWishlist(itemId?: string, ownerId?: string) {
    const { user } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [loading, setLoading] = useState(false);

    const checkStatus = useCallback(async () => {
        if (!user || !itemId) return;
        try {
            const q = query(
                collection(firestore, "wishlist"),
                where("createdBy", "==", user.uid),
                where("itemId", "==", itemId)
            );
            const snap = await getDocs(q);
            setIsWishlisted(!snap.empty);
        } catch {
            // A failed check just leaves the heart unfilled — not worth a toast.
        }
    }, [user, itemId]);

    useEffect(() => { checkStatus() }, [checkStatus]);

    const recordActivity = async (action: ActivityAction) => {
        if (!user || !itemId || !ownerId) return;
        try {
            await addDoc(collection(firestore, "activities"), {
                recipientId: ownerId,
                action,
                itemId,
                read: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: user.uid,
            });
        } catch {
            // Not worth failing the save over — the wishlist toggle already succeeded.
        }
    };

    const toggle = async () => {
        if (!user || !itemId) {
            toast.error("Sign in to save items");
            return;
        }
        setLoading(true);
        try {
            const wishlistRef = collection(firestore, "wishlist");
            if (isWishlisted) {
                const q = query(wishlistRef, where("createdBy", "==", user.uid), where("itemId", "==", itemId));
                const snap = await getDocs(q);
                await Promise.all([
                    ...snap.docs.map((d) => deleteDoc(d.ref)),
                    recordActivity(ActivityAction.ITEM_REMOVED_FROM_WISHLIST),
                ]);
                toast.success("Removed from wishlist");
            } else {
                await Promise.all([
                    addDoc(wishlistRef, { createdBy: user.uid, itemId, createdAt: new Date() }),
                    recordActivity(ActivityAction.ITEM_ADDED_TO_WISHLIST),
                ]);
                toast.success("Added to wishlist");
            }
            setIsWishlisted((v) => !v);
        } catch (error: any) {
            const message = FirebaseErrors[error.code] || error.message;
            toast.error("Failed to update wishlist", { description: message });
        } finally {
            setLoading(false);
        }
    };

    return { isWishlisted, loading, toggle };
}
