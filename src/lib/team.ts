/**
 * The people on the team page.
 *
 * Previously a hard-coded array in the page component, which meant a deploy to
 * fix a job title and no way for anyone without the repository to correct their
 * own bio. These are real named people, so the ability to fix a detail quickly
 * matters more here than almost anywhere else on the site.
 */

export interface TeamMember {
    id?: string;
    name: string;
    role: string;
    bio?: string;
    photoUrl?: string;
    /** Optional public links. Anything else is noise on a page like this. */
    linkedin?: string;
    /** Lower sorts first. Gaps are fine — the list is renumbered on reorder. */
    order: number;
    /** Hidden members stay on file; somebody on leave is not somebody deleted. */
    published: boolean;
    createdAt: string;
    updatedAt: string;
}

export const BIO_MAX = 400;

export function validateTeamMember(input: Partial<TeamMember>): string | null {
    const name = (input.name ?? "").trim();
    if (name.length < 2) return "Give the person a name.";
    if (!(input.role ?? "").trim()) return "What is their role?";
    if ((input.bio ?? "").length > BIO_MAX) return `Keep the bio under ${BIO_MAX} characters.`;
    return null;
}

/** Initials for the avatar when there is no photograph. */
export function initialsOf(name: string): string {
    return (name ?? "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

/** Published members in display order, with a stable tiebreak on name. */
export function sortTeam<T extends Pick<TeamMember, "order" | "name">>(members: T[]): T[] {
    return [...members].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
