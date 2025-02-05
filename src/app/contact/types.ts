export interface ContactFormData {
    name: string;
    email: string;
    phoneNumber: string;
    message: string;
    service: ContactServiceType;
}

export enum ContactServiceType {
    Partnership = "Partnership",
    Support = "Support",
    JoinTeam = "Join Team",
    Other = "Other"
}