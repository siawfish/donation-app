import React, { useCallback, useEffect, useState, useTransition } from "react"
import { SheetContent, SheetTitle } from "./ui/sheet"
import {
    CalendarIcon, EyeIcon, HandIcon, LockIcon, MapPin, MessageCircleIcon,
    PencilIcon, ChevronLeft, ChevronRight, ShieldCheck, Sparkles,
} from "lucide-react"
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
import DeliveryEstimate from "./DeliveryEstimate"
import { VerifiedBadge } from "./verification/VerifiedBadge"

/** Status shown in the decision column, derived from request + item state. */
type Standing =
    | { tone: "info" | "pending" | "good" | "closed"; title: string; body: string }
    | null

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
    const [_, startTransition] = useTransition()

    // Copy addresses the other person by name rather than as "the donor".
    const firstName = donor?.name?.split(" ")[0] || "the owner"
    const isMine = !!user?.uid && user.uid === item?.createdBy
    const photos = item?.assets ?? []

    useEffect(() => {
        (async () => {
            try {
                if (!id || !item || !user) return
                if (item?.createdBy === user?.uid) return
                const q = query(collection(firestore, 'views'), where('itemId', '==', id), where('viewerId', '==', user?.uid))
                const docs = await getDocs(q)
                if (docs.size > 0) return
                await Promise.all([
                    addDoc(collection(firestore, 'views'), { itemId: id, date: new Date().toISOString(), viewerId: user?.uid }),
                    updateDoc(doc(firestore, 'items', id), { views: (item?.views || 0) + 1 })
                ])
            } catch (error) {
                console.log(error)
            }
        })()
    }, [item, user, id])

    const getResource = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            setActiveImage(0)
            const docRef = doc(firestore, 'items', id)
            let requestDoc
            let docSnap

            if (user?.uid) {
                const q = query(collection(firestore, 'requests'), where('itemId', '==', id), where('createdBy', '==', user.uid))
                ;[requestDoc, docSnap] = await Promise.all([getDocs(q), getDoc(docRef)])
            } else {
                docSnap = await getDoc(docRef)
            }

            const donorDoc = await getDoc(doc(firestore, 'users', docSnap.data()?.createdBy))

            setRequest(
                requestDoc && requestDoc.docs.length > 0
                    ? ({ ...requestDoc.docs[0].data(), id: requestDoc.docs[0].id } as RequestType)
                    : null
            )
            setDonor({ ...donorDoc.data(), id: donorDoc.id } as UserType)
            setItem({ ...docSnap.data(), id: docSnap.id } as ItemType)
        } catch (error: any) {
            toast.error('Error fetching item', {
                description: FirebaseErrors[error.code] || error.message,
                position: 'bottom-left',
            })
        } finally {
            setLoading(false)
        }
    }, [id, user])

    useEffect(() => { getResource() }, [getResource])

    const handleRequest = () => {
        if (_) return
        startTransition(async () => {
            try {
                if (!user || !id || !donor?.id) throw new Error('Invalid user or donor')
                await sendRequest({ itemId: id, donorId: donor.id, status: RequestStatus.PENDING })
                toast.success('Sent', {
                    description: `${firstName} will let you know shortly.`,
                    position: 'bottom-left',
                })
            } catch (error: any) {
                toast.error('Could not send your request', {
                    description: FirebaseErrors[error.code] || error.message,
                    position: 'bottom-left',
                })
            } finally {
                getResource()
            }
        })
    }

    /** One place deciding what the viewer is told, rather than five stacked alerts. */
    const standing: Standing = (() => {
        if (item?.donatedOn) return { tone: "closed", title: "Rehomed", body: "This one has found a new home — plenty more nearby." }
        if (isMine) return null
        if (request?.status === RequestStatus.PENDING) return { tone: "pending", title: `Waiting on ${firstName}`, body: "We'll let you know as soon as they reply." }
        if (request?.status === RequestStatus.ACCEPTED) return { tone: "good", title: "It's yours", body: `${firstName} said yes — message them to arrange a pickup.` }
        if (request?.status === RequestStatus.REJECTED) return { tone: "closed", title: "Not this time", body: `${firstName} passed this one to someone else.` }
        return { tone: "info", title: "How this works", body: `Ask for it and ${firstName} decides. Once they say yes, you can message to arrange a pickup.` }
    })()

    const toneClass: Record<string, string> = {
        info: "bg-sand text-ink",
        pending: "bg-amber-50 text-amber-900",
        good: "bg-lime text-forest",
        closed: "bg-gray-100 text-gray-500",
    }

    const step = (dir: -1 | 1) =>
        setActiveImage((i) => (i + dir + photos.length) % photos.length)

    return (
        <SheetContent
            side="right"
            className="w-full p-0 bg-canvas sm:max-w-none lg:w-[min(1060px,94vw)] overflow-y-auto"
        >
            {loading ? (
                <ItemLoader />
            ) : !item ? (
                <EmptyState title="Item not found" description="This listing may have been rehomed or removed." />
            ) : (
                <>
                    <SheetTitle className="sr-only">{item.name}</SheetTitle>

                    {/* Gallery left, decision column right — the pattern people already
                        know from every marketplace, and it keeps the primary action
                        visible instead of buried under the description. */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-0 lg:gap-8 lg:p-8">

                        {/* ── Gallery ── */}
                        <div className="lg:sticky lg:top-8 lg:self-start">
                            <div className="relative w-full aspect-square lg:aspect-[4/3] lg:rounded-3xl overflow-hidden bg-sand group">
                                {photos[activeImage]?.url ? (
                                    <Image
                                        src={photos[activeImage].url}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 620px"
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                        <Sparkles className="w-10 h-10" />
                                    </div>
                                )}

                                <span className="absolute top-4 left-4 bg-lime text-forest text-[11px] font-extrabold px-3 py-1.5 rounded-full tracking-widest">
                                    FREE
                                </span>

                                <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-black/45 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    {item.views ?? 0}
                                </span>

                                {photos.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => step(-1)}
                                            aria-label="Previous photo"
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-ink flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => step(1)}
                                            aria-label="Next photo"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-ink flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <span className="absolute bottom-4 right-4 bg-black/45 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                                            {activeImage + 1}/{photos.length}
                                        </span>
                                    </>
                                )}
                            </div>

                            {photos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 lg:px-0 mt-3">
                                    {photos.map((asset, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveImage(index)}
                                            aria-label={`Photo ${index + 1}`}
                                            className={`relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 transition-all ${
                                                index === activeImage
                                                    ? "ring-2 ring-forest ring-offset-2 ring-offset-canvas"
                                                    : "opacity-55 hover:opacity-100"
                                            }`}
                                        >
                                            <Image src={asset.url} alt="" fill sizes="64px" className="object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Decision column ── */}
                        <div className="px-4 lg:px-0 pt-5 lg:pt-0 pb-[calc(8rem+var(--safe-bottom))] lg:pb-0 flex flex-col gap-5">

                            {/* Identity first — you should know what this is before anything else */}
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight leading-[1.05]">
                                        {item.name}
                                    </h2>
                                    <div className="flex-shrink-0 pt-1">
                                        <Condition condition={item.condition!} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                    {item.categories?.map((category) => (
                                        <Link
                                            key={category?.id}
                                            href={`/explore?cid=${encodeURIComponent(category?.id)}`}
                                            className="text-xs font-semibold text-forest bg-primary-light hover:bg-lime px-3 py-1 rounded-full transition-colors"
                                        >
                                            {category?.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Facts */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                {(item.locationName || item.distance != null) && (
                                    <span className="inline-flex items-center gap-1.5 text-ink font-medium">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        {item.distance != null ? formatDistance(item.distance) : item.locationName}
                                    </span>
                                )}
                                {item.createdAt && (
                                    <span className="inline-flex items-center gap-1.5 text-gray-500 capitalize">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        {formatRelative(new Date(item.createdAt), new Date())}
                                    </span>
                                )}
                            </div>

                            {/* Single status line rather than a stack of alerts */}
                            {standing && (
                                <div className={`rounded-2xl px-4 py-3 ${toneClass[standing.tone]}`}>
                                    <p className="text-sm font-bold">{standing.title}</p>
                                    <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{standing.body}</p>
                                </div>
                            )}

                            {/* Sits with the decision, not the description: the cost of
                                getting it home is part of whether to ask at all. */}
                            {!isMine && <DeliveryEstimate item={item} />}

                            {item.description && (
                                <div>
                                    <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">Description</p>
                                    <p className="text-ink text-base leading-relaxed whitespace-pre-line">{item.description}</p>
                                </div>
                            )}

                            {/* Owner */}
                            <div>
                                <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">Passing it on</p>
                                <div className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-2xl px-4 py-3.5">
                                    <Avatar className="h-11 w-11">
                                        <AvatarFallback className="bg-forest text-lime text-sm font-bold">
                                            {getInitials(donor?.name || '')}
                                        </AvatarFallback>
                                        <AvatarImage src={donor?.profileUrl} alt={donor?.name} />
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-ink truncate flex items-center gap-1.5">
                                            {donor?.name}
                                            {donor?.verified && <VerifiedBadge />}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {donor?.verified ? "Identity verified · " : ""}
                                            {donor?.preferedLocation || "Community member"}
                                        </p>
                                    </div>
                                </div>
                                <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Always free. Never send money for anything on Givny.
                                </p>
                            </div>

                            {/* Actions — inline on desktop, pinned on mobile */}
                            <div className="hidden lg:block">
                                <Actions
                                    isMine={isMine}
                                    signedIn={!!user?.uid}
                                    item={item}
                                    request={request}
                                    firstName={firstName}
                                    id={id}
                                    busy={_}
                                    onAsk={() => setConfirmRequest(true)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile action bar */}
                    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))]">
                        <Actions
                            isMine={isMine}
                            signedIn={!!user?.uid}
                            item={item}
                            request={request}
                            firstName={firstName}
                            id={id}
                            busy={_}
                            onAsk={() => setConfirmRequest(true)}
                        />
                    </div>
                </>
            )}

            <ConfirmDialog
                title={`Ask ${firstName} for ${item?.name}`}
                onConfirm={handleRequest}
                submitLabel="Send request"
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

/** Shared by the desktop column and the mobile bar so both stay in step. */
function Actions({
    isMine, signedIn, item, request, firstName, id, busy, onAsk,
}: {
    isMine: boolean
    signedIn: boolean
    item: ItemType
    request: RequestType | null
    firstName: string
    id: string | null
    busy: boolean
    onAsk: () => void
}) {
    const base = "rounded-full py-6 w-full"

    if (isMine) {
        return (
            <Link href={`/app/edit-item/${id}`} className="block">
                <CustomButton
                    variant="outline"
                    className={`${base} border-forest !text-forest hover:bg-transparent`}
                    disabled={!!item.donatedOn}
                    icon={<PencilIcon className="w-4 h-4" />}
                >
                    Edit listing
                </CustomButton>
            </Link>
        )
    }

    if (!signedIn) {
        return (
            <Link href={`/auth/login?redirect=/explore?id=${id}`} className="block">
                <CustomButton className={`${base} !bg-forest hover:!bg-forest-dark`} icon={<LockIcon className="w-4 h-4" />}>
                    Sign in to ask
                </CustomButton>
            </Link>
        )
    }

    if (item.donatedOn) {
        return (
            <Link href="/explore" className="block">
                <CustomButton className={`${base} !bg-forest hover:!bg-forest-dark`}>
                    Browse what&apos;s still available
                </CustomButton>
            </Link>
        )
    }

    // Accepted: messaging is the next step, so it becomes the primary action.
    if (request?.status === RequestStatus.ACCEPTED) {
        return (
            <Link href={`/app/messages?rid=${request.id}`} className="block">
                <CustomButton className={`${base} !bg-forest hover:!bg-forest-dark`} icon={<MessageCircleIcon className="w-4 h-4" />}>
                    Message {firstName}
                </CustomButton>
            </Link>
        )
    }

    if (request) {
        return (
            <CustomButton className={`${base} !bg-gray-200 !text-gray-500`} disabled icon={<HandIcon className="w-4 h-4" />}>
                Already asked
            </CustomButton>
        )
    }

    return (
        <CustomButton
            className={`${base} !bg-forest hover:!bg-forest-dark`}
            onClick={onAsk}
            disabled={busy}
            isLoading={busy}
            icon={<HandIcon className="w-4 h-4" />}
        >
            Ask for it
        </CustomButton>
    )
}
