"use client";

import Image from "next/image"
import { MapPin } from "lucide-react"
import { formatDistance } from "@/lib/distance"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, getDocs, addDoc, deleteDoc } from "firebase/firestore"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { useState, useEffect, useCallback } from "react"
import { Button } from "./button"
import { ActivityAction } from "@/app/types"

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
}: ImageCardProps) {
    const { user } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [loading, setLoading] = useState(false);

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

                {/* FREE badge */}
                <div className="absolute top-3 left-3 bg-lime text-forest text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-widest">
                    FREE
                </div>

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
            </div>
            <div className="p-3.5 pt-3">
                <h3 className={`text-sm font-bold text-ink truncate ${titleClassName}`}>{title}</h3>
                <p className={`text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed ${descriptionClassName}`}>
                    {description}
                </p>
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