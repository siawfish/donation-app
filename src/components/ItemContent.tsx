import React, { useEffect, useState } from "react"
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"
import { CalendarIcon, EyeIcon, HandIcon, LockIcon, MessageCircleIcon, PencilIcon } from "lucide-react"
import CustomAlert from "./CustomAlert"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import CustomButton from "./Button"
import Image from "next/image"
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, getDoc, where, query, getDocs, updateDoc, addDoc } from "firebase/firestore"
import { DonorType, ItemType } from "@/app/types"
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

export default function ItemContent() {
    const { user } = useAuth()
    const [item, setItem] = useState<ItemType | null>(null)
    const [donor, setDonor] = useState<DonorType | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

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

    useEffect(() => {
        if (!id) return
        void (async () => {
            try {
                setLoading(true)
                const docRef = doc(firestore, 'items', id)
                const docSnap = await getDoc(docRef)
                const donorDoc = await getDoc(doc(firestore, 'users', docSnap.data()?.createdBy))
                setDonor({
                    ...donorDoc.data(),
                    id: donorDoc.id
                } as DonorType)
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
        })()
    }, [id, user])
    
    return (
        <SheetContent className="min-w-[100vw] lg:min-w-[600px] px-0">
            {
                loading ? (
                    <ItemLoader />
                ) : (
                    !item ? (
                        <EmptyState title="Item not found" description="The item you are looking for does not exist" />
                    ) : (
                        <>
                            <div className="flex flex-col gap-6 h-full overflow-y-auto pb-24 px-4 md:px-6">
                                <SheetHeader>
                                    <div className="flex flex-row items-center gap-2 mb-3">
                                        <div className="flex flex-row items-center gap-1">
                                            <EyeIcon className="w-4 h-4" />
                                            <p className="text-sm font-medium text-muted-foreground font-cabinetLight mt-[1px]">Viewed {item?.views} times</p>
                                        </div>
                                    </div>
                                    {
                                        user?.uid !== item?.createdBy && (
                                            <CustomAlert 
                                                title="Contact Donor" 
                                                description="You will only be able to contact the donor once you have requested the item and it has been accepted by the donor. This is to protect the donor from receiving unsolicited messages." 
                                                variant="warning" 
                                            />
                                        )
                                    }
                                    <div className="w-full flex flex-row justify-between items-center pt-3">
                                        <div className="flex flex-col items-start gap-2">
                                            <small className="text-muted-foreground font-cabinet">Item Name</small>
                                            <SheetTitle className="text-3xl font-cabinet tracking-tight font-bold mb-0 pb-0 leading-[80%]">{item?.name}</SheetTitle>
                                            <div className="flex flex-row items-center gap-2">
                                                {
                                                    item?.categories?.map((category) => (
                                                        <Badge key={category?.id} variant="outline" className="border-black text-primary">
                                                            <p className="text-xs font-medium text-black font-cabinet px-2 mt-[1px]">{category?.name}</p>
                                                        </Badge>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                        <Condition condition={item?.condition!} />
                                    </div>
                                </SheetHeader>
                                <div className="flex flex-col gap-2">
                                    <small className="text-muted-foreground font-cabinet">Description</small>
                                    <SheetDescription className="text-black font-cabinetLight text-base">
                                        {item?.description}
                                    </SheetDescription>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <small className="text-muted-foreground font-cabinet">Media</small>
                                    <div className="flex flex-row flex-wrap gap-2">
                                        {
                                            item?.assets?.map((asset, index) => (
                                                <div key={index} className="w-[80px] h-[80px] bg-gray-200 rounded-sm cursor-pointer">
                                                    <Image src={asset?.url} alt="Placeholder" className="rounded-sm object-cover min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px]" width={80} height={80} />
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <small className="text-muted-foreground font-cabinet">Listed by</small>
                                    <div className="flex flex-row items-center gap-2">
                                        <Avatar>
                                            <AvatarFallback>
                                                <p className="text-xs font-medium text-white font-cabinet px-2 mt-[1px]">{getInitials(donor?.name || '')}</p>
                                            </AvatarFallback>
                                            <AvatarImage src={donor?.profileUrl} alt="Placeholder" />
                                        </Avatar>
                                        <div className="flex flex-col gap-0">
                                            <p className="text-base font-medium text-black font-cabinet mt-[1px]">{donor?.name}</p>
                                            <p className="text-xs font-medium text-muted-foreground font-cabinetLight mt-[1px]">{donor?.city}, {donor?.state}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <small className="text-muted-foreground font-cabinet">Listed on</small>
                                    <div className="flex flex-row items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        <span className="text-black font-cabinetLight text-base capitalize">
                                            {item?.createdAt && formatRelative(new Date(item?.createdAt || ''), new Date())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {
                                user?.uid !== item?.createdBy ? (
                                    <>
                                        {
                                            user?.uid ? (
                                                <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                                    <CustomButton 
                                                        variant="outline" 
                                                        className="w-[180px] border-primary !text-primary rounded-full hover:bg-transparent"
                                                        onClick={() => {}}
                                                        disabled={true}
                                                        icon={<MessageCircleIcon className="w-4 h-4" />}
                                                    >
                                                        Contact Donor
                                                    </CustomButton>
                                                    <CustomButton 
                                                        variant="default" 
                                                        className="w-[180px] rounded-full"
                                                        onClick={() => window.alert("COMING SOON!!!!")}
                                                        icon={<HandIcon className="w-4 h-4" />}
                                                    >
                                                        Request Item
                                                    </CustomButton>
                                                </div>
                                            ) : (
                                                <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                                    <Link href={`/auth/login?redirect=/explore?id=${id}`}>
                                                        <CustomButton 
                                                            variant="default" 
                                                            className="w-[180px] rounded-full"
                                                            icon={<LockIcon className="w-4 h-4" />}
                                                        >
                                                            Login
                                                        </CustomButton>
                                                    </Link>
                                                </div>
                                            )
                                        }
                                    </>
                                ) : (
                                    <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                        <CustomButton 
                                            variant="outline" 
                                            className="w-[180px] border-primary !text-primary rounded-full hover:bg-transparent py-6"
                                            onClick={() => {}}
                                            icon={<PencilIcon className="w-4 h-4" />}
                                        >
                                            Edit Item
                                        </CustomButton>
                                    </div>
                                )
                            }
                        </>
                    )
                )
            }
        </SheetContent>
    )
}