'use client'

import React, { useCallback, useEffect, useState, useTransition } from "react"
import { SheetContent, SheetTitle } from "./ui/sheet"
import {
    CalendarIcon, EyeIcon, HandIcon, Heart, LockIcon, MapPin, MessageCircleIcon,
    PencilIcon, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Building2, Trash2Icon,
    Share2Icon, BookmarkIcon, CheckCircle2Icon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import CustomButton from "./Button"
import { Button } from "./ui/button"
import Image from "next/image"
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, getDoc, where, query, getDocs, updateDoc, addDoc } from "firebase/firestore"
import { ItemType, RequestStatus, RequestType, UserType } from "@/app/types"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { Condition } from "./Condition"
import { formatRelative } from "date-fns"
import { cn, getInitials } from "@/lib/utils"
import ItemLoader from "./ItemLoader"
import EmptyState from "./EmptyState"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryState } from "nuqs"
import { ConfirmDialog } from "./ConfirmDialog"
import { SafetyDialog } from "./SafetyDialog"
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover"
import { sendRequest } from "@/app/app/actions/requests"
import { deleteItem, markItemDonated, setItemReserved } from "@/app/app/actions/items"
import { formatDistance } from "@/lib/distance"
import DeliveryEstimate from "./DeliveryEstimate"
import { VerifiedBadge } from "./verification/VerifiedBadge"
import { ShareButtons } from "./ShareButtons"
import { listingShareMessage } from "@/lib/listingCopy"
import { PUBLIC_SITE_URL as SITE } from "@/lib/seo";
import { useWishlist } from "@/hooks/use-wishlist"
import { SizeDetails, EcoNotice } from "./listing/ItemFacts"


const SAFETY_NOTICE_SEEN_KEY = "givny:safety-notice-seen"

/** Status shown in the decision column, derived from request + item state. */
type Standing =
    | { tone: "info" | "pending" | "good" | "closed"; title: string; body: string }
    | null

export default function ItemContent() {
    const { user } = useAuth()
    const [item, setItem] = useState<ItemType | null>(null)
    const [donor, setDonor] = useState<UserType | null>(null)
    /**
     * The organisation this was listed for, when there is one.
     *
     * An organisation's listing is the organisation's, not the staff member's
     * who typed it in — so the page credits the organisation. The individual
     * still owns the conversation, because somebody has to answer.
     */
    const [org, setOrg] = useState<{ name: string; slug: string; logoUrl?: string; verified?: boolean } | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const [id, setId] = useQueryState('id')
    const [confirmRequest, setConfirmRequest] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmMarkGiven, setConfirmMarkGiven] = useState(false)
    const [request, setRequest] = useState<RequestType | null>(null)
    const [activeImage, setActiveImage] = useState(0)
    const [showSafety, setShowSafety] = useState(false)
    const [_, startTransition] = useTransition()
    const [deleting, startDeleteTransition] = useTransition()
    const [reserving, startReserveTransition] = useTransition()
    const [marking, startMarkTransition] = useTransition()

    // Copy addresses the other person by name rather than as "the donor".
    // An organisation's listing is answered in the organisation's name, so the
    // copy addresses it rather than whichever member of staff typed it in.
    const firstName = org?.name || donor?.name?.split(" ")[0] || "the owner"
    const isMine = !!user?.uid && user.uid === item?.createdBy
    const photos = item?.assets ?? []

    // Once ever, per browser — the first listing someone opens is when a
    // safety reminder is actually useful, not the fiftieth. Skipped for your
    // own listing, where "meet up safely" doesn't apply.
    useEffect(() => {
        if (!item || isMine) return
        try {
            if (window.localStorage.getItem(SAFETY_NOTICE_SEEN_KEY)) return
            window.localStorage.setItem(SAFETY_NOTICE_SEEN_KEY, "1")
            setShowSafety(true)
        } catch {
            // Private browsing or storage blocked — not worth failing the page over.
        }
    }, [item, isMine])

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

            // Read the organisation for its logo and verified mark. Rules only
            // expose active organisations, so a paused one quietly falls back
            // to the name stamped on the item.
            const orgId = docSnap.data()?.orgId
            if (orgId) {
                const stamped = {
                    name: docSnap.data()?.orgName ?? "",
                    slug: docSnap.data()?.orgSlug ?? "",
                }
                try {
                    const orgDoc = await getDoc(doc(firestore, "organisations", orgId))
                    const d = orgDoc.data()
                    setOrg(d
                        ? { name: d.name, slug: d.slug, logoUrl: d.logoUrl, verified: d.verified }
                        : (stamped.name ? stamped : null))
                } catch {
                    setOrg(stamped.name ? stamped : null)
                }
            } else {
                setOrg(null)
            }
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

    const handleDelete = () => {
        if (deleting) return
        startDeleteTransition(async () => {
            try {
                if (!id) throw new Error('Missing item')
                const { success, message } = await deleteItem(id)
                if (!success) throw new Error(message)
                toast.success('Listing deleted', { position: 'bottom-left' })
                setConfirmDelete(false)
                setId(null) // closes the sheet
                router.refresh() // the grid behind it is stale otherwise
            } catch (error: any) {
                toast.error('Could not delete listing', {
                    description: FirebaseErrors[error.code] || error.message,
                    position: 'bottom-left',
                })
            }
        })
    }

    const handleToggleReserved = () => {
        if (reserving || !id || !item) return
        const next = !item.reserved
        startReserveTransition(async () => {
            try {
                const { success, message } = await setItemReserved(id, next)
                if (!success) throw new Error(message)
                setItem((prev) => (prev ? { ...prev, reserved: next } : prev))
                toast.success(next ? 'Marked as reserved' : 'No longer reserved', {
                    description: next
                        ? "It's hidden from browse until you unmark it — still here in Up for grabs."
                        : "Back in front of everyone browsing.",
                    position: 'bottom-left',
                })
            } catch (error: any) {
                toast.error('Could not update the listing', {
                    description: FirebaseErrors[error.code] || error.message,
                    position: 'bottom-left',
                })
            }
        })
    }

    const handleMarkGiven = () => {
        if (marking) return
        startMarkTransition(async () => {
            try {
                if (!id) throw new Error('Missing item')
                const { success, message } = await markItemDonated(id)
                if (!success) throw new Error(message)
                toast.success('Marked as given out', {
                    description: 'Moved to Passed on.',
                    position: 'bottom-left',
                })
                setConfirmMarkGiven(false)
                getResource() // reflects the new state in this sheet without closing it
                router.refresh() // the list behind it is stale otherwise
            } catch (error: any) {
                toast.error('Could not update the listing', {
                    description: FirebaseErrors[error.code] || error.message,
                    position: 'bottom-left',
                })
            }
        })
    }

    /** One place deciding what the viewer is told, rather than five stacked alerts. */
    const standing: Standing = (() => {
        if (item?.donatedOn) return { tone: "closed", title: "Rehomed", body: "This one has found a new home — plenty more nearby." }
        if (isMine) {
            if (item?.reserved) return { tone: "pending", title: "Reserved", body: "Hidden from browse until you unmark it — still visible here in Up for grabs." }
            return null
        }
        if (request?.status === RequestStatus.PENDING) return { tone: "pending", title: `Waiting on ${firstName}`, body: "We'll let you know as soon as they reply." }
        if (request?.status === RequestStatus.ACCEPTED) return { tone: "good", title: "It's yours", body: `${firstName} said yes — message them to arrange a pickup.` }
        if (request?.status === RequestStatus.REJECTED) return { tone: "closed", title: "Not this time", body: `${firstName} passed this one to someone else.` }
        // Only reached with no request of your own already in flight — someone
        // already mid-conversation about this item keeps seeing their own status.
        if (item?.reserved) return { tone: "closed", title: "Reserved", body: "The owner already has someone lined up for this one — check back later." }
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

    // Points at the listing's own page, not this sheet. `/explore?id=…` works
    // in a browser but previews as the generic explore page, so every listing
    // shared into WhatsApp looked the same.
    const shareUrl = `${SITE}/listing/${id}`
    const shareTitle = item
        ? listingShareMessage({
            title: item.name,
            listerName: org?.name ?? donor?.name,
            isOrganisation: !!org,
            gone: !!item.donatedOn,
        })
        : ""

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
                                {(item.categories?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
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
                                )}
                                <h2 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight leading-[1.05]">
                                    {item.name}
                                </h2>
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

                            {/* Condition gets its own row rather than crowding the title —
                                same chip the wizard's preview shows, so what's promised is
                                what's seen. */}
                            {item.condition && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Condition condition={item.condition} />
                                </div>
                            )}

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

                            {/* Size gets its own row now — a field, not a line buried in prose. */}
                            <SizeDetails size={item.size} />

                            <EcoNotice />

                            {/* Owner — not shown to yourself. You already know who's passing it on. */}
                            {!isMine && (
                            <div>
                                <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">Passing it on</p>
                                {org ? (
                                    /* Listed for an organisation — it is the lister, and its
                                       page is the thing worth clicking through to. */
                                    <Link
                                        href={`/o/${org.slug}`}
                                        className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-2xl px-4 py-3.5 hover:border-forest/40 transition-colors"
                                    >
                                        <span className="h-11 w-11 rounded-xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {org.logoUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={org.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Building2 className="w-5 h-5 text-forest" />
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="text-base font-bold text-ink truncate flex items-center gap-1.5">
                                                {org.name}
                                                {org.verified && <VerifiedBadge />}
                                            </span>
                                            <span className="block text-xs text-gray-400 truncate">
                                                Organisation · view their page
                                            </span>
                                        </span>
                                    </Link>
                                ) : (
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
                                )}
                                <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Always free. Never send money for anything on Givny.
                                </p>
                            </div>
                            )}

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
                                    onDelete={() => setConfirmDelete(true)}
                                    deleting={deleting}
                                    onToggleReserved={handleToggleReserved}
                                    reserving={reserving}
                                    onMarkGiven={() => setConfirmMarkGiven(true)}
                                    marking={marking}
                                    shareUrl={shareUrl}
                                    shareTitle={shareTitle}
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
                            onDelete={() => setConfirmDelete(true)}
                            deleting={deleting}
                            onToggleReserved={handleToggleReserved}
                            reserving={reserving}
                            onMarkGiven={() => setConfirmMarkGiven(true)}
                            marking={marking}
                            shareUrl={shareUrl}
                            shareTitle={shareTitle}
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

            <ConfirmDialog
                title={`Delete ${item?.name}?`}
                onConfirm={handleDelete}
                submitLabel="Yes, delete it"
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
            >
                <p className="text-ink text-base font-medium">
                    This removes the listing for good — anyone who&apos;s asked for it will no longer be able to reach you about it. This can&apos;t be undone.
                </p>
            </ConfirmDialog>

            <ConfirmDialog
                title={`Mark ${item?.name} as given out?`}
                onConfirm={handleMarkGiven}
                submitLabel="Yes, mark as given out"
                open={confirmMarkGiven}
                onOpenChange={setConfirmMarkGiven}
            >
                <p className="text-ink text-base font-medium">
                    This closes it to new requests and moves it to Passed on — use this once you&apos;ve actually handed it over, in or outside the app.
                </p>
            </ConfirmDialog>

            <SafetyDialog
                open={showSafety}
                onOpenChange={setShowSafety}
                title="Before you get in touch"
                intro="Givny connects neighbours directly — a couple of things worth knowing."
                tips={[
                    "Meet in a public place, or bring a friend along if you can.",
                    "Everything here is free — never send money, even for \"shipping\" or a \"deposit\".",
                    "Check the item matches the photos and description before you commit to picking it up.",
                    "Keep the conversation in Givny messages until you've arranged a pickup.",
                ]}
            />
        </SheetContent>
    )
}

/**
 * The favourite/wishlist toggle for a visitor viewing someone else's
 * listing — the same heart the explore grid offers, so saving works
 * identically wherever an item is seen.
 */
function WishlistAction({
    itemId, ownerId, className,
}: {
    itemId: string
    ownerId?: string
    className?: string
}) {
    const { isWishlisted, loading, toggle } = useWishlist(itemId, ownerId)
    return (
        <Button
            type="button"
            variant="outline"
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
            onClick={toggle}
            disabled={loading}
            className={className}
        >
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
    )
}

/**
 * The Share trigger — a button that pops WhatsApp/X/Facebook/Copy link,
 * rather than laying them all out inline.
 *
 * Built on the plain `Button` rather than `CustomButton`: Radix's
 * `PopoverTrigger asChild` clones its child with a ref so it can measure and
 * anchor the popover, and `CustomButton` isn't `forwardRef` — the ref would
 * silently fail to attach and the popover would never find its anchor.
 */
function ShareAction({
    url, title, className, iconOnly = false,
}: {
    url: string
    title: string
    className?: string
    iconOnly?: boolean
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn("inline-flex items-center justify-center gap-2", className)}
                    aria-label="Share"
                >
                    <Share2Icon className="w-4 h-4" />
                    {!iconOnly && "Share"}
                </Button>
            </PopoverTrigger>
            {/* A fixed width rather than w-auto: ShareButtons now lays its
                targets out in a two-column grid, which needs a real width to
                divide rather than shrinking to fit its content. */}
            <PopoverContent align="end" className="w-72 p-3">
                <ShareButtons url={url} title={title} includeLinkedIn={false} label="" />
            </PopoverContent>
        </Popover>
    )
}

/** Shared by the desktop column and the mobile bar so both stay in step. */
function Actions({
    isMine, signedIn, item, request, firstName, id, busy, onAsk, onDelete, deleting,
    onToggleReserved, reserving, onMarkGiven, marking, shareUrl, shareTitle,
}: {
    isMine: boolean
    signedIn: boolean
    item: ItemType
    request: RequestType | null
    firstName: string
    id: string | null
    busy: boolean
    onAsk: () => void
    onDelete: () => void
    deleting: boolean
    onToggleReserved: () => void
    reserving: boolean
    onMarkGiven: () => void
    marking: boolean
    shareUrl: string
    shareTitle: string
}) {
    const base = "rounded-full py-6"

    if (isMine) {
        // Once it's gone, nothing else about it is still true — the only thing
        // left to do with a passed-on listing is take it off the record.
        const isGone = !!item.donatedOn
        if (isGone) {
            return (
                <CustomButton
                    type="button"
                    variant="outline"
                    className={`${base} w-full border-red-200 !text-red-600 hover:bg-red-50`}
                    icon={<Trash2Icon className="w-4 h-4" />}
                    onClick={onDelete}
                    disabled={deleting}
                    isLoading={deleting}
                >
                    Delete listing
                </CustomButton>
            )
        }
        // Edit is the one thing an owner comes back to do most, so it's the
        // lone solid button; Share and Delete sit beside it as equally-quick
        // circular actions rather than a whole second row. Mark-as-given-out
        // and reserved stay below as outline/ghost — real but secondary.
        return (
            <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2 w-full">
                    <Link href={`/app/edit-item/${id}`} className="flex-1 block">
                        <CustomButton
                            className={`${base} w-full !bg-forest hover:!bg-forest-dark`}
                            icon={<PencilIcon className="w-4 h-4" />}
                        >
                            Edit listing
                        </CustomButton>
                    </Link>
                    <ShareAction
                        url={shareUrl}
                        title={shareTitle}
                        iconOnly
                        className="rounded-full py-6 px-5 flex-shrink-0 border-gray-200 !text-ink hover:bg-transparent"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        aria-label="Delete listing"
                        onClick={onDelete}
                        disabled={deleting}
                        className="rounded-full py-6 px-5 flex-shrink-0 border-gray-200 !text-red-500 hover:bg-red-50 hover:border-red-200"
                    >
                        <Trash2Icon className="w-4 h-4" />
                    </Button>
                </div>

                <CustomButton
                    type="button"
                    variant="outline"
                    className={`${base} w-full border-gray-200 !text-ink hover:bg-gray-50`}
                    icon={<CheckCircle2Icon className="w-4 h-4" />}
                    onClick={onMarkGiven}
                    disabled={marking}
                    isLoading={marking}
                >
                    Mark as given out
                </CustomButton>

                <CustomButton
                    type="button"
                    variant="ghost"
                    className="justify-center gap-1.5 rounded-full py-3 !text-amber-700 hover:!bg-amber-50"
                    icon={<BookmarkIcon className="w-3.5 h-3.5" />}
                    onClick={onToggleReserved}
                    disabled={reserving}
                    isLoading={reserving}
                >
                    {item.reserved ? "Unmark reserved" : "Mark as reserved"}
                </CustomButton>
            </div>
        )
    }

    // Everything below shares one shape: a primary action plus a Share
    // button, so sharing stays available to a visitor regardless of where
    // they are in the ask flow.
    let primary: React.ReactNode

    if (!signedIn) {
        primary = (
            <Link href={`/auth/login?redirect=/explore?id=${id}`} className="flex-1 block">
                <CustomButton className={`${base} w-full !bg-forest hover:!bg-forest-dark`} icon={<LockIcon className="w-4 h-4" />}>
                    Sign in to ask
                </CustomButton>
            </Link>
        )
    } else if (item.donatedOn) {
        primary = (
            <Link href="/explore" className="flex-1 block">
                <CustomButton className={`${base} w-full !bg-forest hover:!bg-forest-dark`}>
                    Browse what&apos;s still available
                </CustomButton>
            </Link>
        )
        // Nothing left to ask for — sharing a gone listing isn't useful.
        return <div className="flex gap-2 w-full">{primary}</div>
    } else if (request?.status === RequestStatus.ACCEPTED) {
        // Accepted: messaging is the next step, so it becomes the primary action.
        primary = (
            <Link href={`/app/messages?rid=${request.id}`} className="flex-1 block">
                <CustomButton className={`${base} w-full !bg-forest hover:!bg-forest-dark`} icon={<MessageCircleIcon className="w-4 h-4" />}>
                    Message {firstName}
                </CustomButton>
            </Link>
        )
    } else if (request) {
        primary = (
            <CustomButton className={`${base} flex-1 !bg-gray-200 !text-gray-500`} disabled icon={<HandIcon className="w-4 h-4" />}>
                Already asked
            </CustomButton>
        )
    } else if (item.reserved) {
        primary = (
            <CustomButton className={`${base} flex-1 !bg-gray-200 !text-gray-500`} disabled icon={<BookmarkIcon className="w-4 h-4" />}>
                Reserved
            </CustomButton>
        )
    } else {
        primary = (
            <CustomButton
                className={`${base} flex-1 !bg-forest hover:!bg-forest-dark`}
                onClick={onAsk}
                disabled={busy}
                isLoading={busy}
                icon={<HandIcon className="w-4 h-4" />}
            >
                Ask for it
            </CustomButton>
        )
    }

    return (
        <div className="flex gap-2 w-full">
            {primary}
            {/* A signed-out visitor's primary button already routes to sign-in —
                offering a heart that just toasts "sign in" on top of that is
                redundant, so it only appears once there's an account to save to. */}
            {signedIn && (
                <WishlistAction
                    itemId={id!}
                    ownerId={item.createdBy}
                    className="rounded-full py-6 px-5 flex-shrink-0 border-gray-200 !text-ink hover:bg-transparent"
                />
            )}
            <ShareAction
                url={shareUrl}
                title={shareTitle}
                iconOnly
                className="rounded-full py-6 px-5 flex-shrink-0 border-gray-200 !text-ink hover:bg-transparent"
            />
        </div>
    )
}
