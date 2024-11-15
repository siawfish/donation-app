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
    condition: ConditionType;
    assets: AssetType[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    donatedTo?: string;
    donatedOn?: string;
    views: number;
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