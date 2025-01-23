"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
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
        <Card className={`w-full max-w-md overflow-hidden border-none bg-secondary h-full shadow-none rounded-none ${containerClassName}`}>
            <div className="relative w-full h-48">
                <Image
                    src={image}
                    alt="Card image"
                    layout="fill"
                    objectFit="cover"
                />
                {user && itemId && createdBy && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="max-w-8 max-h-8 absolute top-2 right-2 bg-primary-foreground hover:scale-110 transition-transform"
                        onClick={handleWishlist}
                        disabled={loading}
                    >
                        {
                            isWishlisted ? (
                                <Image 
                                    src="/like.png"
                                    alt="Heart"
                                    width={18}
                                    height={18}
                                />
                            ) : (
                                <Image 
                                    src="/unlike.png"
                                    alt="Heart"
                                    width={18}
                                    height={18}
                                />
                            )
                        }
                    </Button>
                )}
            </div>
            <CardHeader className="px-0 py-2">
                <CardTitle className={`text-lg font-medium ${titleClassName}`}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <p className={`text-sm text-muted-foreground line-clamp-3 ${descriptionClassName}`}>
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}