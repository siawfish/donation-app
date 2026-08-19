/**
 * Admin roles and capabilities.
 *
 * Roles are stored in Firestore (`adminRoles/{uid}`) rather than as Firebase
 * custom claims. Custom claims would be the textbook choice — they ride in the
 * JWT so an edge middleware can check them without a read — but Auth admin
 * operations are not reliably available in this project's environment, which
 * would make *granting* a role fail. A Firestore document is equally
 * unforgeable here because every check runs server-side through the Admin SDK
 * and the rules deny clients any access to the collection.
 *
 * The trade-off is one extra read per check; it is memoised per request.
 */

export type AdminRole = "super_admin" | "admin" | "moderator";

export type Capability =
    | "analytics.view"
    | "users.view"
    | "users.suspend"
    | "listings.view"
    | "listings.remove"
    | "verifications.review"
    | "roles.manage"
    | "settings.manage"
    | "crm.view"
    | "crm.manage";

/** What each role may do. Deliberately explicit rather than hierarchical, so
 *  reading this table tells you exactly what a role can reach. */
const CAPABILITIES: Record<AdminRole, Capability[]> = {
    super_admin: [
        "analytics.view",
        "users.view",
        "users.suspend",
        "listings.view",
        "listings.remove",
        "verifications.review",
        "roles.manage",
        "settings.manage",
        "crm.view",
        "crm.manage",
    ],
    admin: [
        "analytics.view",
        "users.view",
        "users.suspend",
        "listings.view",
        "listings.remove",
        "verifications.review",
        "settings.manage",
        "crm.view",
        "crm.manage",
    ],
    moderator: ["analytics.view", "listings.view", "listings.remove", "verifications.review", "crm.view"],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: "Super admin",
    admin: "Admin",
    moderator: "Moderator",
};

export const ROLE_BLURB: Record<AdminRole, string> = {
    super_admin: "Full access, including granting and removing other admins.",
    admin: "Manage members and listings, review verifications, see analytics, switch features on and off.",
    moderator: "Review verifications and remove listings, read the CRM. No member management.",
};

export function can(role: AdminRole | null | undefined, capability: Capability): boolean {
    if (!role) return false;
    return CAPABILITIES[role]?.includes(capability) ?? false;
}

export function isAdminRole(value: unknown): value is AdminRole {
    return value === "super_admin" || value === "admin" || value === "moderator";
}

export interface AdminRoleRecord {
    uid: string;
    role: AdminRole;
    email?: string;
    name?: string;
    grantedBy?: string;
    grantedAt: string;
}
