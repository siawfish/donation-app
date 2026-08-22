/**
 * The words a shared listing travels with.
 *
 * A link preview is the whole advert. "Browse what's nearby — Givny" tells a
 * stranger nothing; "Kwame is giving away a fridge" tells them everything, and
 * the name is the part that makes it feel like a neighbour rather than a
 * classified ad.
 *
 * Everything here is pure so the same sentence can be produced by the metadata
 * generator on the server and by a share button in the browser — two surfaces
 * that must never disagree about what a listing says.
 */

/** Just the first name. Friendlier, and it keeps a full legal name out of a broadcast. */
export function firstNameOf(name: string): string {
    return (name ?? "").trim().split(/\s+/)[0] || "A neighbour";
}

/**
 * "a", "an", or nothing at all.
 *
 * Titles are typed by members, so they arrive as singulars, plurals and mass
 * nouns alike. Getting this wrong is the difference between "a fridge" and
 * "a Books", which reads as machine-written and undoes the point of the sentence.
 */
export function articleFor(title: string): "a " | "an " | "" {
    const words = (title ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";

    const first = words[0].toLowerCase();
    // English noun phrases take their head from the LAST word, so that is what
    // decides whether an article belongs at all. Testing the first word instead
    // produces "an Office chairs" — the mistake this exists to prevent.
    const head = words[words.length - 1].toLowerCase();

    // Plurals take no article. `-ss`, `-us` and `-is` are usually singular
    // ("dress", "bus", "tennis"), so they are excluded from the test.
    if (/s$/.test(head) && !/(ss|us|is)$/.test(head)) return "";

    // Common uncountables that would otherwise read as "a rice".
    const UNCOUNTABLE = [
        "rice", "water", "furniture", "clothing", "equipment", "luggage",
        "stationery", "food", "wood", "cloth", "money", "jewellery", "jewelry",
    ];
    if (UNCOUNTABLE.includes(head)) return "";

    // "an" goes by the SOUND of the first word. The exceptions are where the
    // letter and the sound disagree — "a university", "an hour".
    if (/^(hour|honest|honour|honor|heir)/.test(first)) return "an ";
    if (/^(uni|use|user|usb|one|euro)/.test(first)) return "a ";
    return /^[aeiou]/.test(first) ? "an " : "a ";
}

/** Capitalise a phrase that has ended up starting a sentence. */
function sentenceCase(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface ListingSubject {
    title: string;
    /** Full name of the member, or the organisation's name. */
    listerName?: string;
    isOrganisation?: boolean;
    locationName?: string;
    gone?: boolean;
}

/** How the lister is referred to: a first name, or an organisation in full. */
export function listerLabel({ listerName, isOrganisation }: ListingSubject): string | null {
    if (!listerName?.trim()) return null;
    // An organisation is the entity, not the person who typed it in, so its
    // name is never shortened.
    return isOrganisation ? listerName.trim() : firstNameOf(listerName);
}

/**
 * The headline in a link preview, and the browser tab.
 *
 * Leads with the person because that is what makes a stranger stop. Falls back
 * to the item alone when we have no name to use.
 */
export function listingHeadline(subject: ListingSubject): string {
    const who = listerLabel(subject);
    const thing = `${articleFor(subject.title)}${subject.title}`;

    if (subject.gone) {
        return who
            ? `${who}'s ${subject.title} has found a home`
            : `${subject.title} has found a home`;
    }

    return who
        ? `${who} is giving away ${thing} — free`
        : `${sentenceCase(thing)} — free on Givny`;
}

/** The supporting line under the headline. Adds the where, and the urgency. */
export function listingDescription(subject: ListingSubject, itemDescription?: string): string {
    if (subject.gone) {
        return "This one has gone, but there's plenty more nearby on Givny.";
    }

    const where = subject.locationName?.trim();
    const detail = itemDescription?.trim().replace(/\s+/g, " ");

    // The item's own words first when there are any — nobody describes a thing
    // better than the person passing it on.
    if (detail) {
        return `${detail.slice(0, 110)}${detail.length > 110 ? "…" : ""} · Free on Givny${where ? `, ${where}` : ""}.`;
    }

    return `Free on Givny${where ? `, in ${where}` : ""}. First to ask, gets it.`;
}

/**
 * The message someone actually types into WhatsApp.
 *
 * Deliberately NOT the same sentence as the headline. WhatsApp shows the typed
 * message and the link card together, so repeating it reads as a stutter — this
 * is the greeting, and the card supplies the detail.
 */
export function listingShareMessage(subject: ListingSubject): string {
    const who = listerLabel(subject);
    const thing = `${articleFor(subject.title)}${subject.title}`;

    if (subject.gone) {
        return `${subject.title} on Givny`;
    }

    // An organisation whose name already contains "Givny" would otherwise
    // produce "Givny is giving away … on Givny". Naming the platform twice in
    // one sentence reads as a template rather than as a person.
    const suffix = who && /givny/i.test(who) ? "for free 👇" : "for free on Givny 👇";

    return who
        ? `Hey! ${who} is giving away ${thing} ${suffix}`
        : `Someone's giving away ${thing} for free on Givny 👇`;
}
