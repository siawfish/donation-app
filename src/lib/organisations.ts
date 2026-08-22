/**
 * Organisations — businesses, NGOs, schools and faith groups that list at scale.
 *
 * WHY THIS IS NOT JUST A BIGGER MEMBER ACCOUNT
 * --------------------------------------------
 * The obvious implementation is a flag on a user. It fails for four reasons
 * that show up immediately in practice:
 *
 * 1. Several people act for one entity. A facilities manager lists, an intern
 *    answers requests, and neither should share a password.
 * 2. Staff leave. Ownership of the listings has to survive the person.
 * 3. Trust is different in kind. A stranger trusts "Ama in Dansoman" because
 *    she is a verified neighbour; they trust a company because it is a
 *    registered entity with a name to lose.
 * 4. The incentive is different. A neighbour lists to be rid of something. A
 *    business needs a reason its finance director accepts, and an NGO needs
 *    something to show a funder.
 *
 * That fourth point drives the design. The product for an organisation is not
 * the listing form — it is the impact record: what they diverted from landfill,
 * over what period, evidenced. Everything else here exists to make that record
 * trustworthy.
 */

import type { ParcelSize } from "./delivery";

export type OrgType = "business" | "ngo" | "school" | "faith" | "government" | "other";

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
    business: "Business",
    ngo: "NGO / non-profit",
    school: "School or university",
    faith: "Church, mosque or faith group",
    government: "Government or public body",
    other: "Other",
};

/**
 * What each type is usually here for. Shown during application so an applicant
 * recognises themselves, and used to pick the right onboarding copy.
 */
export const ORG_TYPE_MOTIVE: Record<OrgType, string> = {
    business: "Clear stock, fixtures and office equipment — and evidence the diversion for reporting.",
    ngo: "Reach the people you serve, and source goods you would otherwise buy.",
    school: "Move on furniture, books and equipment at the end of a term or year.",
    faith: "Coordinate giving inside your congregation and the streets around it.",
    government: "Redistribute public assets instead of disposing of them.",
    other: "Tell us what you have and who it should reach.",
};

/**
 * The lifecycle. Deliberately explicit rather than a boolean, because the
 * interesting states are the middle ones — an organisation that applied and is
 * waiting is a real thing that needs a screen.
 */
export type OrgStatus =
    | "applied"      // submitted, nobody has looked yet
    | "reviewing"    // an admin picked it up
    | "approved"     // cleared, but has not finished setting up
    | "active"       // live, storefront visible
    | "paused"       // temporarily hidden at their request or ours
    | "rejected";

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
    applied: "Applied",
    reviewing: "In review",
    approved: "Approved",
    active: "Active",
    paused: "Paused",
    rejected: "Declined",
};

export const ORG_STATUS_TONE: Record<OrgStatus, "neutral" | "info" | "good" | "warn" | "bad"> = {
    applied: "info",
    reviewing: "warn",
    approved: "good",
    active: "good",
    paused: "warn",
    rejected: "bad",
};

/** Only these appear publicly. Everything else is between them and us. */
export const PUBLIC_STATUSES: OrgStatus[] = ["active"];

/* ── Team ──────────────────────────────────────────────────────────────── */

/**
 * Roles inside an organisation, separate from platform admin roles.
 *
 * Kept to three because a fourth is never obvious to whoever assigns it.
 */
export type OrgRole = "owner" | "manager" | "lister";

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
    owner: "Owner",
    manager: "Manager",
    lister: "Lister",
};

export const ORG_ROLE_BLURB: Record<OrgRole, string> = {
    owner: "Everything, including team and account settings.",
    manager: "List, answer requests, and manage the storefront.",
    lister: "Add and edit listings only.",
};

export type OrgCapability = "listings.write" | "requests.answer" | "storefront.edit" | "team.manage";

const ORG_CAPABILITIES: Record<OrgRole, OrgCapability[]> = {
    owner: ["listings.write", "requests.answer", "storefront.edit", "team.manage"],
    manager: ["listings.write", "requests.answer", "storefront.edit"],
    lister: ["listings.write"],
};

export function orgCan(role: OrgRole | null | undefined, capability: OrgCapability): boolean {
    if (!role) return false;
    return ORG_CAPABILITIES[role]?.includes(capability) ?? false;
}

export interface OrgMember {
    uid: string;
    orgId: string;
    role: OrgRole;
    name?: string;
    email?: string;
    addedBy?: string;
    addedAt: string;
}

/* ── The organisation ──────────────────────────────────────────────────── */

export interface Organisation {
    id?: string;
    name: string;
    slug: string;
    type: OrgType;
    status: OrgStatus;

    /** Public storefront content. */
    tagline?: string;
    about?: string;          // markdown
    logoUrl?: string;
    coverUrl?: string;
    website?: string;
    locationName?: string;
    lat?: number;
    lng?: number;

    /** Applied for, and checked by an admin before `active`. */
    registrationNumber?: string;
    /** Set only by an admin, and only after they have seen evidence. */
    verified?: boolean;
    verifiedAt?: string;

    /** Who applied — the first owner. */
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    /** Free text from the application: why they want to be here. */
    motivation?: string;

    /** Admin-only. */
    internalNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;

    createdBy: string;
    createdAt: string;
    updatedAt: string;
    activatedAt?: string;

    /**
     * Set when Givny built the page rather than the organisation applying.
     *
     * We prepare pages for organisations we are pitching, so a prospect can see
     * their own storefront instead of imagining one. That is a genuinely useful
     * sales tool and a dishonest one if it is hidden: a page the organisation
     * has never seen must never look like a page they run. Hence `claim`.
     */
    createdByAdmin?: boolean;
    claim?: ClaimStatus;
    claimedAt?: string;
    /** Who accepted the invitation and became the first owner. */
    claimedBy?: string;
}

/**
 * Whether a real person at the organisation has taken the page over.
 *
 * `unclaimed` is a public state, not a hidden one — the storefront says so in
 * plain words, the directory marks it, and search engines are told not to index
 * it. Nobody should be able to mistake a prepared page for a live one.
 */
export type ClaimStatus = "unclaimed" | "invited" | "claimed";

export const CLAIM_LABELS: Record<ClaimStatus, string> = {
    unclaimed: "Not claimed",
    invited: "Invite sent",
    claimed: "Claimed",
};

/** True when this page was prepared by us and nobody has taken it over yet. */
export function isUnclaimed(org: Pick<Organisation, "createdByAdmin" | "claim">): boolean {
    return !!org.createdByAdmin && org.claim !== "claimed";
}

/* ── Invitations ───────────────────────────────────────────────────────── */

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface OrgInvite {
    id?: string;
    orgId: string;
    orgName: string;
    orgSlug: string;
    /** Random, single-use, and the only thing standing between a stranger and ownership. */
    token: string;
    /** Who it was prepared for. The accepting account does not have to match. */
    email: string;
    name?: string;
    role: OrgRole;
    status: InviteStatus;
    invitedBy: string;
    createdAt: string;
    expiresAt: string;
    acceptedAt?: string;
    acceptedBy?: string;
}

/** How long an invitation stays good for. Long enough to survive a slow reply. */
export const INVITE_DAYS = 30;

export function inviteExpiry(from = new Date()): string {
    const d = new Date(from);
    d.setDate(d.getDate() + INVITE_DAYS);
    return d.toISOString();
}

export function inviteExpired(invite: Pick<OrgInvite, "expiresAt">): boolean {
    const at = Date.parse(invite.expiresAt);
    return Number.isFinite(at) && at < Date.now();
}

/** Whether an invitation can still be accepted, and why not when it cannot. */
export function inviteProblem(invite: Pick<OrgInvite, "status" | "expiresAt">): string | null {
    if (invite.status === "accepted") return "That invitation has already been used.";
    if (invite.status === "revoked") return "That invitation was withdrawn.";
    if (inviteExpired(invite)) return "That invitation has expired. Ask us for a new one.";
    return null;
}

export function slugifyOrg(input: string): string {
    return (input ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

export function isValidOrgSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 60;
}

/* ── Onboarding ────────────────────────────────────────────────────────── */

/**
 * The setup checklist.
 *
 * Derived from the record rather than stored as booleans, so it can never claim
 * something is done that isn't — the usual failure of a stored checklist.
 */
export interface OnboardingStep {
    id: string;
    label: string;
    /** Why it matters, in the organisation's own interest rather than ours. */
    why: string;
    done: boolean;
    href?: string;
    /**
     * Shown when a step has been started but doesn't yet count.
     *
     * Without this a saved-but-too-short About reads as a save that failed:
     * the field holds their text, the step stays unticked, and nothing on the
     * screen explains the gap.
     */
    hint?: string;
}

/**
 * How much "About" text counts as saying who you are.
 *
 * A dozen words tells a stranger nothing, so the step holds out for more — but
 * the number has to be visible wherever it is enforced, or it just looks broken.
 */
export const ABOUT_MIN_CHARS = 60;

export function onboardingSteps(
    org: Organisation,
    counts: { listings: number; team: number }
): OnboardingStep[] {
    const aboutLength = (org.about ?? "").trim().length;

    return [
        {
            id: "approved",
            label: "Application approved",
            why: "We check that the organisation is real before the storefront goes public.",
            done: ["approved", "active", "paused"].includes(org.status),
        },
        {
            id: "logo",
            label: "Add a logo",
            why: "A storefront without a logo reads as abandoned, and people don't ask.",
            done: !!org.logoUrl,
            href: "/app/organisation?tab=storefront",
        },
        {
            id: "about",
            label: "Say who you are",
            why: "People decide whether to ask based on this, not on your listings.",
            done: aboutLength >= ABOUT_MIN_CHARS,
            href: "/app/organisation?tab=storefront",
            hint:
                aboutLength > 0 && aboutLength < ABOUT_MIN_CHARS
                    ? `Saved — but it's ${aboutLength} of the ${ABOUT_MIN_CHARS} characters this needs. A sentence or two more.`
                    : undefined,
        },
        {
            id: "listing",
            label: "Post your first item",
            why: "An empty storefront can't be shared. One item makes it real.",
            done: counts.listings > 0,
            href: "/app/add-item",
        },
        {
            id: "team",
            label: "Invite a colleague",
            why: "Requests arrive at awkward times. One person is a single point of failure.",
            done: counts.team > 1,
            href: "/app/organisation?tab=team",
        },
    ];
}

export function onboardingProgress(steps: OnboardingStep[]): number {
    if (!steps.length) return 0;
    return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

/* ── Impact ────────────────────────────────────────────────────────────── */

/**
 * Rough weight per size band, in kilograms.
 *
 * These are estimates and the UI says so. A precise figure would need weighing
 * every item, which nobody will do — and a stated estimate that is honest about
 * being one is far more useful to a sustainability report than no figure at all.
 */
export const SIZE_KG: Record<ParcelSize, number> = {
    small: 2,
    medium: 10,
    large: 35,
};

/** Used when a listing predates the size field. Deliberately the lowest band. */
const UNKNOWN_KG = SIZE_KG.small;

export interface OrgImpact {
    listed: number;
    rehomed: number;
    /** Still available — inventory, not impact, but they need to see it. */
    available: number;
    /** Estimated kilograms diverted from disposal. */
    kgDiverted: number;
    /** Distinct members who received something. */
    householdsReached: number;
    /** Of everything listed, how much found a home. */
    rehomingRate: number;
    firstListedAt?: string;
}

export const EMPTY_IMPACT: OrgImpact = {
    listed: 0, rehomed: 0, available: 0, kgDiverted: 0,
    householdsReached: 0, rehomingRate: 0,
};

export function estimateKg(items: { parcelSize?: ParcelSize }[]): number {
    return items.reduce((kg, i) => kg + (i.parcelSize ? SIZE_KG[i.parcelSize] : UNKNOWN_KG), 0);
}

/**
 * A sentence an organisation can paste into a report.
 *
 * Written to be defensible: it says "an estimated", names the basis, and never
 * rounds a small number up into something grander than it is.
 */
export function impactSentence(org: { name: string }, impact: OrgImpact): string {
    if (impact.rehomed === 0) {
        return `${org.name} has listed ${impact.listed} item${impact.listed === 1 ? "" : "s"} on Givny.`;
    }
    return (
        `${org.name} passed on ${impact.rehomed} item${impact.rehomed === 1 ? "" : "s"} to ` +
        `${impact.householdsReached} household${impact.householdsReached === 1 ? "" : "s"} through Givny, ` +
        `diverting an estimated ${impact.kgDiverted} kg from disposal.`
    );
}
