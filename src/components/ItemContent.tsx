import React, { useCallback, useEffect, useState, useTransition } from "react"
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"
import { CalendarIcon, EyeIcon, HandIcon, LockIcon, MapPin, MessageCircleIcon, PencilIcon } from "lucide-react"
import CustomAlert from "./CustomAlert"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import CustomButton from "./Button"
import Image from "next/image"
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, getDoc, where, query, getDocs, updateDoc, addDoc } from "firebase/firestore"
import { ItemType, RequestStatus, RequestType, UserType } from "@/app/types"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { Condition } from "./Condition"
import { formatRelative } from "date-fns"
import { getInitials } from "@/lib/utils"
import ItemLoader from "./ItemLoader"
import EmptyState from "./EmptyState"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ConfirmDialog } from "./ConfirmDialog"
import { sendRequest } from "@/app/app/actions/requests"
import { formatDistance } from "@/lib/distance"

export default function ItemContent() {
    const { user } = useAuth()
    const [item, setItem] = useState<ItemType | null>(null)
    const [donor, setDonor] = useState<UserType | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const [confirmRequest, setConfirmRequest] = useState(false)
    const [request, setRequest] = useState<RequestType | null>(null)
    const [activeImage, setActiveImage] = useState(0)
    // Copy addresses the other person by name rather than as "the donor".
    const firstName = donor?.name?.split(" ")[0] || "the owner"
    const [_, startTransition] = useTransition()

    useEffect(()=>{
        (async () => {
            try {
                if (!id || !item || !user) return
                if(item?.createdBy === user?.uid) return
                const q = query(collection(firestore, 'views'), where('itemId', '==', id), where('viewerId', '==', user?.uid))
                const docs = await getDocs(q)
                if (docs.size > 0) return
                const viewsCollectionRef = collection(firestore, 'views')
                const itemRef = doc(firestore, 'items', id)
                await Promise.all([
                    addDoc(viewsCollectionRef, { itemId: id, date: new Date().toISOString(), viewerId: user?.uid }),
                    updateDoc(itemRef, { views: (item?.views || 0) + 1 })
                ])
            } catch (error) {
                console.log(error)
            }
        })()
    },[item, user, id])

    const getResource = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            setActiveImage(0)
            const docRef = doc(firestore, 'items', id)
            let requestDoc;
            let docSnap;

            if (user?.uid) {
                const q = query(collection(firestore, 'requests'), where('itemId', '==', id), where('createdBy', '==', user.uid))
                ;[requestDoc, docSnap] = await Promise.all([
                    getDocs(q),
                    getDoc(docRef)
                ])
            } else {
                docSnap = await getDoc(docRef)
            }

            const donorDoc = await getDoc(doc(firestore, 'users', docSnap.data()?.createdBy))

            if (requestDoc) {
                setRequest(requestDoc.docs.length > 0 ? {
                    ...requestDoc.docs[0].data(),
                    id: requestDoc.docs[0].id
                } as RequestType : null)
            } else {
                setRequest(null)
            }

            setDonor({
                ...donorDoc.data(),
                id: donorDoc.id
            } as UserType)
            setItem({
                ...docSnap.data(),
                id: docSnap.id
            } as ItemType)
        } catch (error: any) {
            const message = FirebaseErrors[error.code] || error.message
            toast.error('Error fetching item', { description: message, position: 'bottom-left' })
        } finally {
            setLoading(false)
        }
    }, [id, user])

    useEffect(() => {
        getResource()
    }, [getResource])

    const handleRequest = () => {
        if(_) return
        startTransition(async () => {
            try {
                if (!user || !id || !donor?.id) {
                    throw new Error('Invalid user or donor')
                }
                await sendRequest({
                    itemId: id,
                    donorId: donor?.id,
                    status: RequestStatus.PENDING
                })
                toast.success('Request sent successfully', { description: 'You will be notified when the donor either accepts or rejects your request.', position: 'bottom-left' })
            } catch (error: any) {
                const message = FirebaseErrors[error.code] || error.message
                toast.error('Error sending request', { description: message, position: 'bottom-left' })
            } finally {
                getResource()
            }
        })
    }

    return (
        <SheetContent className="min-w-[100vw] lg:min-w-[640px] px-0 bg-canvas">
            {
                loading ? (
                    <ItemLoader />
                ) : (
                    !item ? (
                        <EmptyState title="Item not found" description="The item you are looking for does not exist" />
                    ) : (
                        <>
                            <div className="flex flex-col gap-5 h-full overflow-y-auto pb-28 px-4 md:px-6 pt-2">

                                {/* ── Gallery ── */}
                                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-sand">
                                    {item?.assets?.[activeImage]?.url && (
                                        <Image
                                            src={item.assets[activeImage].url}
                                            alt={item?.name || "Item"}
                                            fill
                                            sizes="(max-width: 1024px) 100vw, 640px"
                                            className="object-cover"
                                            priority
                                        />
                                    )}
                                    {/* FREE badge */}
                                    <div className="absolute top-4 left-4 bg-lime text-forest text-[11px] font-extrabold px-3 py-1.5 rounded-full tracking-widest">
                                        FREE
                                    </div>
                                    {/* views chip */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                                        <EyeIcon className="w-3.5 h-3.5" />
                                        {item?.views ?? 0}
                                    </div>
                                </div>

                                {/* Thumbnails */}
                                {(item?.assets?.length ?? 0) > 1 && (
                                    <div className="flex flex-row gap-2 overflow-x-auto scrollbar-hide -mt-1">
                                        {item?.assets?.map((asset, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveImage(index)}
                                                className={`relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 transition-all ${
                                                    index === activeImage ? "ring-2 ring-forest ring-offset-2 ring-offset-canvas" : "opacity-60 hover:opacity-100"
                                                }`}
                                            >
                                                <Image src={asset?.url} alt={`photo ${index + 1}`} fill sizes="64px" className="object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* ── Status alerts ── */}
                                {user?.uid !== item?.createdBy && !request && (
                                    <CustomAlert
                                        title="How this works"
                                        description={`Ask for this item and ${firstName} decides. Once they say yes, you can message each other to arrange a pickup.`}
                                        variant="warning"
                                    />
                                )}
                                {request && request?.status === RequestStatus.PENDING && (
                                    <CustomAlert
                                        title={`Asked · waiting on ${firstName}`}
                                        description="We'll let you know as soon as they reply."
                                        variant="warning"
                                    />
                                )}
                                {request && request?.status === RequestStatus.ACCEPTED && (
                                    <CustomAlert
                                        title="It's yours"
                                        description={`${firstName} said yes — message them to arrange a pickup.`}
                                        variant="success"
                                    />
                                )}
                                {request && request?.status === RequestStatus.REJECTED && (
                                    <CustomAlert
                                        title="Not this time"
                                        description={`${firstName} has passed this one to someone else. Plenty more nearby.`}
                                        variant="destructive"
                                    />
                                )}
                                {item?.donatedOn && (
                                    <CustomAlert
                                        title="Rehomed"
                                        description="This one has found a new home. Have a look at what else is nearby."
                                        variant="destructive"
                                    />
                                )}

                                {/* ── Title block ── */}
                                <SheetHeader>
                                    <div className="w-full flex flex-row justify-between items-start gap-3">
                                        <div className="flex flex-col items-start gap-2.5">
                                            <SheetTitle className="text-3xl md:text-4xl font-cabinet tracking-tight font-bold mb-0 pb-0 leading-[1] text-left text-ink">
                                                {item?.name}
                                            </SheetTitle>
                                            <div className="flex flex-row flex-wrap items-center gap-1.5">
                                                {item?.categories?.map((category) => (
                                                    <span key={category?.id} className="text-xs font-semibold text-forest bg-primary-light px-3 py-1 rounded-full">
                                                        {category?.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <Condition condition={item?.condition!} />
                                    </div>
                                </SheetHeader>

                                {/* ── Location & date row ── */}
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-white border border-gray-200/70 rounded-2xl px-4 py-3">
                                    {(item?.locationName || item?.distance != null) && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            <span className="text-ink font-medium">
                                                {item?.distance != null ? formatDistance(item.distance) : item?.locationName}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="capitalize">
                                            {item?.createdAt && formatRelative(new Date(item?.createdAt || ''), new Date())}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Description ── */}
                                <div className="flex flex-col gap-2">
                                    <small className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">Description</small>
                                    <SheetDescription className="text-ink font-cabinetLight text-base leading-relaxed">
                                        {item?.description}
                                    </SheetDescription>
                                </div>

                                {/* ── Donor card ── */}
                                <div className="flex flex-col gap-2">
                                    <small className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">Passing it on</small>
                                    <div className="flex flex-row items-center gap-3 bg-white border border-gray-200/70 rounded-2xl px-4 py-3.5">
                                        <Avatar className="h-11 w-11">
                                            <AvatarFallback className="bg-forest text-lime text-sm font-bold">
                                                {getInitials(donor?.name || '')}
                                            </AvatarFallback>
                                            <AvatarImage src={donor?.profileUrl} alt={donor?.name} />
                                        </Avatar>
                                        <div className="flex flex-col gap-0">
                                            <p className="text-base font-bold text-ink font-cabinet">{donor?.name}</p>
                                            <p className="text-xs text-gray-400 font-cabinetLight">
                                                {donor?.preferedLocation || [donor?.city, donor?.state].filter(Boolean).join(", ") || "Community member"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Action bar ── */}
                            {
                                user?.uid !== item?.createdBy ? (
                                    <>
                                        {
                                            user?.uid ? (
                                                <>
                                                    {
                                                        !request && (
                                                            <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 py-4 flex justify-between md:justify-end gap-2">
                                                                <CustomButton
                                                                    variant="outline"
                                                                    className="flex-1 md:flex-none md:w-[180px] border-forest !text-forest rounded-full hover:bg-transparent py-6"
                                                                    disabled={true}
                                                                    icon={<MessageCircleIcon className="w-4 h-4" />}
                                                                >
                                                                    Message {firstName}
                                                                </CustomButton>
                                                                {
                                                                    !item?.donatedOn && (
                                                                        <CustomButton
                                                                            variant="default"
                                                                            className="flex-1 md:flex-none md:w-[180px] rounded-full py-6 !bg-forest hover:!bg-forest-dark"
                                                                            onClick={() => setConfirmRequest(true)}
                                                                            icon={<HandIcon className="w-4 h-4" />}
                                                                            disabled={_}
                                                                            isLoading={_}
                                                                        >
                                                                            Ask for it
                                                                        </CustomButton>
                                                                    )
                                                                }
                                                            </div>
                                                        )
                                                    }
                                                    {
                                                        request && !item?.donatedOn && (
                                                            <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 py-4 flex justify-between md:justify-end gap-2">
                                                                <Link href={`/app/messages?rid=${request?.id}`} className="flex-1 md:flex-none">
                                                                    <CustomButton
                                                                        variant="outline"
                                                                        className="w-full md:w-[180px] border-forest !text-forest rounded-full hover:bg-transparent py-6"
                                                                        disabled={request?.status !== RequestStatus.ACCEPTED}
                                                                        icon={<MessageCircleIcon className="w-4 h-4" />}
                                                                    >
                                                                        Message {firstName}
                                                                    </CustomButton>
                                                                </Link>
                                                                <CustomButton
                                                                    variant="default"
                                                                    className="flex-1 md:flex-none md:w-[200px] rounded-full py-6 !bg-forest"
                                                                    icon={<HandIcon className="w-4 h-4" />}
                                                                    disabled={true}
                                                                >
                                                                    Already asked
                                                                </CustomButton>
                                                            </div>
                                                        )
                                                    }
                                                </>
                                            ) : (
                                                <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 py-4 flex justify-between md:justify-end gap-2">
                                                    <Link href={`/auth/login?redirect=/explore?id=${id}`} className="flex-1 md:flex-none">
                                                        <CustomButton
                                                            variant="default"
                                                            className="w-full md:w-[180px] rounded-full py-6 !bg-forest hover:!bg-forest-dark"
                                                            icon={<LockIcon className="w-4 h-4" />}
                                                        >
                                                            Sign in to ask
                                                        </CustomButton>
                                                    </Link>
                                                </div>
                                            )
                                        }
                                    </>
                                ) : (
                                    <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 py-4 flex justify-between md:justify-end gap-2">
                                        <Link href={`/app/edit-item/${id}`} className="flex-1 md:flex-none">
                                            <CustomButton
                                                variant="outline"
                                                className="w-full md:w-[180px] border-forest !text-forest rounded-full hover:bg-transparent py-6"
                                                onClick={() => {}}
                                                disabled={_ || !!item?.donatedOn}
                                                isLoading={_}
                                                icon={<PencilIcon className="w-4 h-4" />}
                                            >
                                                Edit Item
                                            </CustomButton>
                                        </Link>
                                    </div>
                                )
                            }
                        </>
                    )
                )
            }
            <ConfirmDialog
                title={`Ask ${firstName} for ${item?.name}`}
                onConfirm={handleRequest}
                submitLabel="Confirm"
                open={confirmRequest}
                onOpenChange={setConfirmRequest}
            >
                <div className="flex flex-col gap-2">
                    <p className="text-ink text-base font-medium">
                        We&apos;ll let {donor?.name} know you&apos;d like {item?.name}.
                    </p>
                    <span className="text-muted-foreground tracking-tight text-sm">
                        They&apos;ll get a notification and can say yes or pass.{" "}
                        <strong>Once they say yes, you two can message to arrange a pickup.</strong>
                    </span>
                </div>
            </ConfirmDialog>
        </SheetContent>
    )
}
