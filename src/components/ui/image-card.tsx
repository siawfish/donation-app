"use client";

import Image from "next/image"
import { MapPin, Images, Building2, Share2, Check } from "lucide-react"
import { formatDistance } from "@/lib/distance"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, getDocs, addDoc, deleteDoc } from "firebase/firestore"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { useState, useEffect, useCallback } from "react"
import { Button } from "./button"
import { ActivityAction } from "@/app/types"

import { listingShareMessage } from "@/lib/listingCopy"

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://givny.com";

interface ImageCardProps {
    image: string;
    title: string;
    description: string;
    itemId?: string;
    containerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    createdBy?: string;
    distance?: number;
    locationName?: string;
    /** Small chip beside FREE, e.g. "2 hours" for freshly listed items */
    badge?: string;
    /** Shows a photo-count pill when a listing has more than one image */
    photoCount?: number;
    /**
     * Set when the listing belongs to an organisation, which is then credited
     * as the lister. Stamped on the item, so naming it costs no extra read.
     */
    orgName?: string;
}

export default function ImageCard({
    image,
    title,
    description,
    itemId,
    containerClassName,
    titleClassName,
    descriptionClassName,
    createdBy,
    distance,
    locationName,
    badge,
    photoCount,
    orgName,
}: ImageCardProps) {
    const { user } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shared, setShared] = useState(false);

    /**
     * Share this listing from the grid, without opening it first.
     *
     * Uses the listing's own page rather than the sheet URL, so the link
     * previews as the item. `stopPropagation` because the whole card is a link.
     */
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!itemId) return;

        const url = `${SITE}/listing/${itemId}`;
        const shareTitle = listingShareMessage({
            title,
            // Cards carry an organisation's name but not a member's, so a
            // neighbour's listing shares under the neutral phrasing rather than
            // inventing a name the card never had.
            listerName: orgName,
            isOrganisation: !!orgName,
        });

        if (typeof navigator !== "undefined" && "share" in navigator) {
            try {
                await navigator.share({ title: shareTitle, url });
                return;
            } catch {
                // A cancelled sheet rejects too — fall through to copying.
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
            toast.success("Link copied");
        } catch {
            toast.error("Couldn't copy the link");
        }
    };

    const checkWishlistStatus = useCallback(async () => {
        if (!user || !itemId) return;
        
        try {
            const wishlistRef = collection(firestore, "wishlist");
            const q = query(
                wishlistRef,
                where("createdBy", "==", user.uid),
                where("itemId", "==", itemId)
            );
            const querySnapshot = await getDocs(q);
            setIsWishlisted(!querySnapshot.empty);
        } catch (error:any) {
            const message = FirebaseErrors[error.code] || error.message;
            toast.error("Something wrong happen",{
                description: message,
                position: "bottom-left"
            })
        }
    }, [user, itemId]);

    useEffect(() => {
        checkWishlistStatus();
    }, [checkWishlistStatus]);

    const handleWishlist = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling to parent card
        e.preventDefault(); // Prevent any default link behavior
        
        setLoading(true);
        try {
            if (!user) {
                throw new Error("Your seesion seem to have expired, please login again")
            }
            const wishlistRef = collection(firestore, "wishlist");
            
            if (isWishlisted) {
                // Remove from wishlist
                const q = query(
                    wishlistRef,
                    where("createdBy", "==", user.uid),
                    where("itemId", "==", itemId)
                );
                const querySnapshot = await getDocs(q);
                const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all([
                    ...deletePromises,
                    recordActivity(ActivityAction.ITEM_REMOVED_FROM_WISHLIST)
                ]);
                toast.success("Removed from wishlist",{
                    position: "bottom-left"
                });
            } else {
                // Add to wishlist
                await Promise.all([
                    addDoc(wishlistRef, {
                        createdBy: user.uid,
                        itemId: itemId,
                        createdAt: new Date(),
                    }),
                    recordActivity(ActivityAction.ITEM_ADDED_TO_WISHLIST)
                ]);
                toast.success("Added to wishlist",{
                    position: "bottom-left"
                });
            }
            setIsWishlisted(!isWishlisted);
        } catch (error:any) {
            const message = FirebaseErrors[error.code] || error.message;
            toast.error("Failed to update wishlist",{
                description: message,
                position: "bottom-left"
            });
        } finally {
            setLoading(false);
        }
    };

    const recordActivity = async (action: ActivityAction) => {
        if (!user || !itemId || !createdBy) return;
        try {
            const activityRef = collection(firestore, "activities");
            await addDoc(activityRef, {
                recipientId: createdBy,
                action: action,
                itemId: itemId,
                read: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: user.uid
            });
        } catch (error:any) {
            const message = FirebaseErrors[error.code] || error.message;
            toast.error("Failed to record activity",{
                description: message
            });
        }
    }

    return (
        <div className={`group card-hover w-full overflow-hidden bg-white rounded-3xl border border-gray-200/70 ${containerClassName}`}>
            <div className="relative w-full aspect-square overflow-hidden bg-sand m-0">
                {image ? (
                    <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                    />
                ) : (
                    <div className="w-full h-full bg-sand flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* FREE badge + optional freshness chip */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="bg-lime text-forest text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-widest">
                        FREE
                    </span>
                    {badge && (
                        <span className="bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>

                {/* Photo count — signals a well-documented listing */}
                {(photoCount ?? 0) > 1 && (
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <Images className="w-3 h-3" />
                        {photoCount}
                    </div>
                )}

                {user && itemId && createdBy && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="max-w-8 max-h-8 absolute top-2.5 right-2.5 bg-white/95 hover:bg-white hover:scale-110 transition-all shadow-sm rounded-full"
                        onClick={handleWishlist}
                        disabled={loading}
                    >
                        {isWishlisted ? (
                            <Image src="/like.png" alt="Saved" width={16} height={16} />
                        ) : (
                            <Image src="/unlike.png" alt="Save" width={16} height={16} />
                        )}
                    </Button>
                )}

                {itemId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Share ${title}`}
                        title="Share this listing"
                        className={`max-w-8 max-h-8 absolute top-2.5 bg-white/95 hover:bg-white hover:scale-110 transition-all shadow-sm rounded-full ${
                            user && createdBy ? "right-12" : "right-2.5"
                        }`}
                        onClick={handleShare}
                    >
                        {shared
                            ? <Check className="w-4 h-4 text-primary" />
                            : <Share2 className="w-4 h-4 text-ink" />}
                    </Button>
                )}
            </div>
            <div className="p-3.5 pt-3">
                <h3 className={`text-sm font-bold text-ink truncate ${titleClassName}`}>{title}</h3>
                <p className={`text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed ${descriptionClassName}`}>
                    {description}
                </p>
                {/* Who listed it, when that is an organisation rather than a neighbour */}
                {orgName && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                        <Building2 className="w-3 h-3 flex-shrink-0 text-forest" />
                        <span className="truncate font-semibold text-forest">{orgName}</span>
                    </div>
                )}
                {/* Distance / location row */}
                {(distance != null || locationName) && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                        <MapPin className={`w-3 h-3 flex-shrink-0 ${distance != null && distance <= 5 ? "text-primary" : "text-gray-300"}`} />
                        {distance != null
                            ? <span className={distance <= 5 ? "text-primary font-semibold" : "text-gray-400"}>{formatDistance(distance)}</span>
                            : <span className="truncate text-gray-400">{locationName}</span>
                        }
                    </div>
                )}
            </div>
        </div>
    )
}