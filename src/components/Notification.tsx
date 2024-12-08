import { ActivityAction, ActivityType, UserType, DonorType, ItemType } from "@/app/types"
import { CheckIcon, XIcon, HandIcon, GiftIcon, HeartIcon, HeartOffIcon, PencilIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns";
import NotificationAction from "./NotificationAction";
import { FirebaseErrors } from "@/firebase/errors"
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import { toast } from "sonner"
import { Button } from "./ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NotificationProps {
    notification: {
        activity: ActivityType;
        creator: UserType | DonorType | null;
        item: ItemType | null;
    };
}

const getNotificationIconAndDescription = (notification: NotificationProps['notification'], pathname: string) => {
    if (notification?.activity?.action === ActivityAction.ITEM_REQUESTED) {
        return {
            icon: <HandIcon className="w-4 h-4 text-gray-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> requested for your item, <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link>.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.REQUEST_ACCEPTED) {
        return {
            icon: <CheckIcon className="w-4 h-4 text-green-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> accepted your request for <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link>.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.REQUEST_REJECTED) {
        return {
            icon: <XIcon className="w-4 h-4 text-red-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> rejected your request for <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link>.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.REQUEST_CANCELLED) {
        return {
            icon: <XIcon className="w-4 h-4 text-red-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> cancelled your request for <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link>.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.REQUEST_COMPLETED) {
        return {
            icon: <GiftIcon className="w-4 h-4 text-green-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> completed your request for <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link>.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.ITEM_ADDED_TO_WISHLIST) {
        return {
            icon: <HeartIcon className="w-4 h-4 text-green-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> added <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link> to their wishlist.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.ITEM_REMOVED_FROM_WISHLIST) {
        return {
            icon: <HeartOffIcon className="w-4 h-4 text-green-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">{notification?.creator?.name}</span> removed <Link href={`${pathname}?id=${notification?.activity?.itemId}`} className="font-medium text-black">{notification?.item?.name}</Link> from their wishlist.</p>
        }
    }
    if (notification?.activity?.action === ActivityAction.ACCOUNT_UPDATED) {
        return {
            icon: <PencilIcon className="w-4 h-4 text-green-500" />,
            description: <p className="text-base text-gray-500"><span className="font-medium text-black">Your profile</span> was updated.</p>
        }
    }
    return {
        icon: null,
        description: null
    }
}

export default function Notification({ notification }: NotificationProps) {

    const pathname = usePathname()

    const markAsRead = async () => {
        try {
            await updateDoc(doc(collection(firestore, 'activities'), notification?.activity?.id), { read: true })
        } catch (error:any) {
            toast.error(FirebaseErrors[error as keyof typeof FirebaseErrors])
        }
    }

    return (
        <div 
            onMouseEnter={markAsRead}
            className={`flex flex-row gap-2 w-full border-b border-gray-200 py-3 px-2 cursor-pointer hover:bg-primary-foreground relative ${!notification?.activity?.read ? 'bg-primary-foreground' : ''}`}
        >
            <div className="flex flex-col justify-center items-center bg-secondary p-2 rounded-md w-[40px] h-[40px]">
                {getNotificationIconAndDescription(notification, pathname)?.icon}
            </div>
            <div className="flex flex-col gap-0 w-full">
                {getNotificationIconAndDescription(notification, pathname)?.description}
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification?.activity?.createdAt || ''), { addSuffix: true })}</p>
                {
                    notification?.activity?.action === ActivityAction.ITEM_REQUESTED && notification?.activity?.requestId && (
                        <NotificationAction 
                            requestId={notification?.activity?.requestId} 
                            creator={notification?.creator}
                        />
                    )
                }
                {
                    notification?.activity?.action === ActivityAction.REQUEST_ACCEPTED && (
                        <div className="flex flex-row justify-end">
                            <Link className="text-xs text-primary hover:underline-none" href={`/app/messages?rid=${notification?.activity?.requestId}`}>
                                <Button className="rounded-full border-primary text-primary hover:bg-primary hover:text-white" variant="outline">
                                    Message {notification?.creator?.name}
                                </Button>
                            </Link>
                        </div>
                    )
                }
            </div>
            {
                !notification?.activity?.read && (
                    <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary mt-3 mr-2" />
                )
            }
        </div>
    )
}