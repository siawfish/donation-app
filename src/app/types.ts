import type { ParcelSize } from "@/lib/delivery";

export enum ConditionType {
    NEW = "new",
    LIKE_NEW = "like_new",
    GOOD = "good",
    FAIR = "fair",
    POOR = "poor"
}

export interface UserRegisterPayload extends UserType {
    password: string;
    /** Token from an admin's invitation email, so acceptance can be recorded. */
    inviteToken?: string;
}

export interface UserType {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    lastLogin: string;
    createdAt: string;
    updatedAt: string;
    profileUrl?: string;
    preferedCategories: string[];
    preferedLocation: string;
    lat?: number;
    lng?: number;
    /** uid of the member whose invite link brought this user in */
    referredBy?: string;
    /** Identity confirmed via Ghana Card. Only the flag and date are retained. */
    verified?: boolean;
    verifiedAt?: string;
    /** Set by an admin; blocks access to the signed-in app. */
    suspended?: boolean;
}

export interface ResponseData<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface ItemType {
    id?: string;
    name: string;
    description: string;
    categories: CategoryType[];
    condition: ConditionType | null;
    /** Clothing/shoe size — only asked for on Women's/Men's Clothing and Shoes. */
    size?: string;
    assets: AssetType[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    donatedTo?: string;
    donatedOn?: string;
    /**
     * Owner-set pause: hidden from browse/search while true, but still shown
     * in the owner's own "Up for grabs" list. For a hand-off arranged outside
     * the app while it's spoken for — distinct from `donatedOn`, which means
     * it's actually gone.
     */
    reserved?: boolean;
    views?: number;
    // Location — stamped from donor's profile at listing time
    lat?: number;
    lng?: number;
    locationName?: string;
    /** Set when listed on behalf of an organisation; drives its storefront. */
    orgId?: string;
    /**
     * The organisation's name and slug, copied at listing time.
     *
     * Denormalised deliberately: every card in a grid would otherwise need its
     * own read of the organisation just to name the lister. `adminUpdateOrganisation`
     * fans a rename out across these, which is the only path that can change
     * either value — anything else that renames an organisation must do the same.
     */
    orgName?: string;
    orgSlug?: string;
    /** Size band used to estimate delivery cost. Matches Flip's `weight` field. */
    parcelSize?: ParcelSize;
    // Computed at query time, never stored in Firestore
    distance?: number;
}

export interface WishlistType {
    id?: string;
    itemId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

/** One member blocking another. Doc id is `${blockerId}_${blockedId}`. */
export interface BlockType {
    blockerId: string;
    blockedId: string;
    createdAt: string;
}

export interface AssetType {
    id: string;
    url: string;
    type: string;
}

export interface CategoryType {
    id: string;
    name: string;
}

export interface PaginatedData<T> {
    items: T;
    total: number;
    page: number;
    limit: number;
}

export interface RequestType {
    id?: string;
    itemId: string;
    donorId: string;
    /** Copied from the item when it belongs to an organisation. */
    orgId?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    status: RequestStatus;
    /**
     * Uids who've deleted this conversation from their own inbox. The
     * request itself — and the other person's view of it — is untouched;
     * this only ever grows, and only for the person who deleted it.
     */
    hiddenFor?: string[];
}

export interface ActivityType {
    id?: string;
    recipientId: string;
    action: ActivityAction;
    itemId?: string;
    requestId?: string;
    /** Set on follower notifications, so the entry can name the organisation. */
    orgId?: string;
    read?: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export enum ActivityAction {
    ITEM_VIEWED = "item_viewed",
    ITEM_REQUESTED = "item_requested",
    REQUEST_COMPLETED = "request_completed",
    REQUEST_CANCELLED = "request_cancelled",
    ITEM_ADDED_TO_WISHLIST = "item_added_to_wishlist",
    ITEM_REMOVED_FROM_WISHLIST = "item_removed_from_wishlist",
    REQUEST_ACCEPTED = "request_accepted",
    REQUEST_REJECTED = "request_rejected",
    MESSAGE_RECEIVED = "message_received",
    ACCOUNT_CREATED = "account_created",
    ACCOUNT_UPDATED = "account_updated",
    ACCOUNT_DELETED = "account_deleted",
    ACCOUNT_VERIFIED = "account_verified",
    /** An organisation someone follows has listed something. */
    ORG_LISTED_ITEM = "org_listed_item"
}

export enum RequestStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    CANCELLED = "cancelled",
    COMPLETED = "completed"
}

export interface MediaType {
    type: string
    url: string
}

export interface MessageType {
  id: string
  senderId: string
  recipientId: string
  content: string
  read: boolean
  media: MediaType[]
  itemId: string
  requestId: string
  createdAt?: string
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}