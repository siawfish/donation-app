export enum ConditionType {
    GOOD = "good",
    FAIR = "fair",
    POOR = "poor"
}

export enum UserTypes {
    DONOR = "donor",
    USER = "user"
}

export enum AccountTypes {
    INDIVIDUAL = "individual",
    ORGANIZATION = "organization"
}

export interface DonorType {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    type: AccountTypes;
    lastLogin: string;
    createdAt: string;
    updatedAt: string;
    userType: UserTypes;
    profileUrl?: string;
}

export interface DonorRegisterPayload extends DonorType {
    password: string;
}

export interface UserRegisterPayload extends UserType {
    password: string;
}

export interface UserType extends DonorType {
    preferedCategories: CategoryType[];
    preferedLocation: string;
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
    assets: AssetType[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    donatedTo?: string;
    donatedOn?: string;
    views?: number;
}

export interface WishlistType {
    id?: string;
    itemId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
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
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    status: RequestStatus;
}

export interface ActivityType {
    id?: string;
    recipientId: string;
    action: ActivityAction;
    itemId?: string;
    requestId?: string;
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
    ACCOUNT_CREATED = "account_created",
    ACCOUNT_UPDATED = "account_updated",
    ACCOUNT_DELETED = "account_deleted",
    ACCOUNT_VERIFIED = "account_verified"
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