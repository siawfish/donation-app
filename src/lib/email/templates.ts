/**
 * Every email the platform can send, in one place.
 *
 * Before this, transactional mail was a subject line typed inline at the call
 * site — which meant nobody could see the whole set, nobody could fix a typo
 * without a deploy, and half the moments that obviously warrant an email
 * (an organisation approved, an application received) sent nothing at all.
 *
 * A template is a default in code plus an optional stored override. Code owns
 * the shape and the variables; the admin owns the words. Resetting a template
 * deletes the override rather than copying the default back, so a later
 * improvement to the default still reaches anyone who has not customised it.
 */

export type TemplateCategory = "transactional" | "marketing";

export type TemplateKey =
    | "welcome"
    | "org_invite"
    | "org_approved"
    | "org_declined"
    | "application_received"
    | "verification_approved"
    | "verification_rejected"
    | "contact_reply"
    | "campaign_default";

export interface TemplateVar {
    name: string;
    description: string;
    example: string;
}

export interface EmailTemplateDef {
    key: TemplateKey;
    name: string;
    /** When it goes out — the admin's first question about any template. */
    trigger: string;
    category: TemplateCategory;
    subject: string;
    preheader: string;
    /** Markdown, rendered by the same renderer as the blog and the campaigns. */
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
    vars: TemplateVar[];
    /** Marketing mail carries an unsubscribe footer; transactional must not. */
    unsubscribable: boolean;
    /** Some templates are wired up; others are defined but not yet triggered. */
    live: boolean;
}

const V = {
    first_name: { name: "first_name", description: "Their first name", example: "Ama" },
    site_url: { name: "site_url", description: "The site address", example: "https://www.givny.com" },
    org_name: { name: "org_name", description: "Organisation name", example: "Tema Refit Ltd" },
    org_url: { name: "org_url", description: "Their storefront", example: "https://www.givny.com/o/tema-refit" },
    claim_url: { name: "claim_url", description: "One-time link to take over the page", example: "https://www.givny.com/claim/…" },
    job_title: { name: "job_title", description: "The role applied for", example: "Community Ambassador" },
    reason: { name: "reason", description: "Why it was declined", example: "We couldn't verify the registration number." },
};

/**
 * The defaults.
 *
 * Written short. Transactional mail is read in three seconds on a phone, and
 * every sentence past the point competes with the one that matters.
 */
export const TEMPLATES: EmailTemplateDef[] = [
    {
        key: "welcome",
        name: "Welcome",
        trigger: "Someone finishes creating an account.",
        category: "transactional",
        subject: "Welcome to Givny, {{first_name}}",
        preheader: "Here's how to get the most out of it.",
        body:
            "Hi {{first_name}},\n\n" +
            "You're in. Givny is where neighbours pass on things they no longer need — " +
            "free, no catch.\n\n" +
            "Two things worth doing now:\n\n" +
            "- **Have a look at what's nearby.** Things move quickly.\n" +
            "- **List one thing you'd never miss.** It takes about a minute, and it's how " +
            "you start earning points towards your first division.",
        ctaLabel: "See what's nearby",
        ctaUrl: "{{site_url}}/explore",
        vars: [V.first_name, V.site_url],
        unsubscribable: false,
        live: false,
    },
    {
        key: "org_invite",
        name: "Organisation invitation",
        trigger: "An admin creates an invitation for a prepared organisation page.",
        category: "transactional",
        subject: "{{org_name}} has a page on Givny — take it over?",
        preheader: "We built it. It's yours if you want it.",
        body:
            "Hi {{first_name}},\n\n" +
            "We've prepared a Givny page for **{{org_name}}**. Take it over and it becomes " +
            "yours to run: change anything on it, list items, add colleagues.\n\n" +
            "Until you accept, the page says publicly that Givny prepared it and that " +
            "{{org_name}} hasn't claimed it. Nothing is listed in your name.",
        ctaLabel: "Take over the page",
        ctaUrl: "{{claim_url}}",
        vars: [V.first_name, V.org_name, V.claim_url, V.site_url],
        unsubscribable: false,
        live: true,
    },
    {
        key: "org_approved",
        name: "Organisation approved",
        trigger: "An admin marks an organisation active.",
        category: "transactional",
        subject: "{{org_name}} is live on Givny",
        preheader: "Your page is public. Here's the link.",
        body:
            "Hi {{first_name}},\n\n" +
            "We've checked {{org_name}} and your page is now public.\n\n" +
            "Add a logo and a short description if you haven't yet — a storefront without " +
            "them reads as abandoned, and people don't ask.",
        ctaLabel: "See your page",
        ctaUrl: "{{org_url}}",
        vars: [V.first_name, V.org_name, V.org_url, V.site_url],
        unsubscribable: false,
        live: true,
    },
    {
        key: "org_declined",
        name: "Organisation declined",
        trigger: "An admin declines an application, with a reason.",
        category: "transactional",
        subject: "About your Givny application",
        preheader: "We couldn't approve it this time.",
        body:
            "Hi {{first_name}},\n\n" +
            "We weren't able to approve {{org_name}} for a Givny page.\n\n" +
            "**Why:** {{reason}}\n\n" +
            "If that's something you can put right, reply to this email and we'll take " +
            "another look.",
        vars: [V.first_name, V.org_name, V.reason, V.site_url],
        unsubscribable: false,
        live: true,
    },
    {
        key: "application_received",
        name: "Job application received",
        trigger: "Someone applies for a role through the careers page.",
        category: "transactional",
        subject: "We've got your application for {{job_title}}",
        preheader: "Here's what happens next.",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for applying for **{{job_title}}**. Your application is with us.\n\n" +
            "We read every one and come back either way, usually within a week or two. " +
            "If we want to talk, we'll email you to arrange a time.",
        vars: [V.first_name, V.job_title, V.site_url],
        unsubscribable: false,
        live: true,
    },
    {
        key: "verification_approved",
        name: "Verification approved",
        trigger: "An admin approves a Ghana Card check.",
        category: "transactional",
        subject: "You're verified, {{first_name}}",
        preheader: "The badge is on your profile.",
        body:
            "Hi {{first_name}},\n\n" +
            "Your ID check passed and the verified badge is on your profile.\n\n" +
            "It matters more than it sounds: people say yes to verified members far more " +
            "often, because they know who they're meeting.",
        ctaLabel: "List something",
        ctaUrl: "{{site_url}}/app/add-item",
        vars: [V.first_name, V.site_url],
        unsubscribable: false,
        live: false,
    },
    {
        key: "verification_rejected",
        name: "Verification not approved",
        trigger: "An admin rejects a Ghana Card check.",
        category: "transactional",
        subject: "We couldn't verify your ID",
        preheader: "Here's what to do next.",
        body:
            "Hi {{first_name}},\n\n" +
            "We weren't able to verify the ID you sent.\n\n" +
            "**Why:** {{reason}}\n\n" +
            "You can try again from your settings — a clear photo of the whole card, with " +
            "nothing cropped off, is usually all it takes.",
        ctaLabel: "Try again",
        ctaUrl: "{{site_url}}/app/settings",
        vars: [V.first_name, V.reason, V.site_url],
        unsubscribable: false,
        live: false,
    },
    {
        key: "contact_reply",
        name: "Contact reply",
        trigger: "An admin answers a message from the contact form.",
        category: "transactional",
        subject: "Re: your message to Givny",
        preheader: "",
        body: "{{reply_body}}",
        vars: [
            { name: "reply_body", description: "What the admin typed", example: "Thanks for getting in touch…" },
            V.first_name,
            V.site_url,
        ],
        unsubscribable: false,
        live: true,
    },
    {
        key: "campaign_default",
        name: "Campaign shell",
        trigger: "The wrapper round every marketing campaign.",
        category: "marketing",
        subject: "",
        preheader: "",
        body: "",
        vars: [V.first_name, V.site_url],
        unsubscribable: true,
        live: true,
    },
];

export const TEMPLATE_MAP: Record<TemplateKey, EmailTemplateDef> = Object.fromEntries(
    TEMPLATES.map((t) => [t.key, t])
) as Record<TemplateKey, EmailTemplateDef>;

/** What an admin has changed. Absent fields fall through to the default. */
export interface TemplateOverride {
    key: TemplateKey;
    subject?: string;
    preheader?: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    /** Switch a template off without deleting the words. */
    enabled?: boolean;
    updatedBy?: string;
    updatedAt?: string;
}

export interface ResolvedTemplate extends EmailTemplateDef {
    customised: boolean;
    enabled: boolean;
}

export function resolveTemplate(
    key: TemplateKey,
    override?: TemplateOverride | null
): ResolvedTemplate {
    const base = TEMPLATE_MAP[key];
    const touched =
        !!override &&
        [override.subject, override.preheader, override.body, override.ctaLabel, override.ctaUrl]
            .some((value) => value != null);

    return {
        ...base,
        subject: override?.subject ?? base.subject,
        preheader: override?.preheader ?? base.preheader,
        body: override?.body ?? base.body,
        ctaLabel: override?.ctaLabel ?? base.ctaLabel,
        ctaUrl: override?.ctaUrl ?? base.ctaUrl,
        customised: touched,
        enabled: override?.enabled !== false,
    };
}

/* ── Variables ─────────────────────────────────────────────────────────── */

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function fillVars(text: string, values: Record<string, string>): string {
    return (text ?? "").replace(VAR_RE, (whole, name: string) =>
        name in values ? values[name] : whole
    );
}

/** Variables in the copy that this template does not define — they'd ship raw. */
export function undefinedVars(text: string, def: EmailTemplateDef): string[] {
    const known = new Set(def.vars.map((v) => v.name));
    const found = new Set<string>();
    const re = new RegExp(VAR_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text ?? "")) !== null) if (!known.has(m[1])) found.add(m[1]);
    return Array.from(found);
}

/** Example values, for previewing a template with nothing real to hand. */
export function exampleValues(def: EmailTemplateDef): Record<string, string> {
    return Object.fromEntries(def.vars.map((v) => [v.name, v.example]));
}

/* ── Checks the editor runs before you can save ────────────────────────── */

export interface TemplateWarning {
    level: "error" | "warn";
    message: string;
}

/**
 * Deliverability and correctness, checked while writing rather than discovered
 * in a spam folder. Errors block saving; warnings do not.
 */
export function checkTemplate(
    def: EmailTemplateDef,
    draft: { subject: string; preheader: string; body: string; ctaLabel?: string; ctaUrl?: string }
): TemplateWarning[] {
    const out: TemplateWarning[] = [];
    const subject = draft.subject.trim();

    if (def.key !== "campaign_default") {
        if (!subject) out.push({ level: "error", message: "A subject line is required." });
        if (!draft.body.trim()) out.push({ level: "error", message: "The message is empty." });
    }

    for (const [field, text] of Object.entries(draft)) {
        if (typeof text !== "string") continue;
        const unknown = undefinedVars(text, def);
        if (unknown.length) {
            out.push({
                level: "error",
                message: `{{${unknown[0]}}} isn't available in this template — it would be sent as written.`,
            });
        }
    }

    if (subject.length > 60) {
        out.push({ level: "warn", message: `Subject is ${subject.length} characters — most phones cut off around 60.` });
    }
    if (subject && subject === subject.toUpperCase() && /[A-Z]{4,}/.test(subject)) {
        out.push({ level: "warn", message: "An all-capitals subject is a strong spam signal." });
    }
    if (/[!]{2,}|free money|click here now|act now/i.test(`${subject} ${draft.body}`)) {
        out.push({ level: "warn", message: "That wording is the kind spam filters score against." });
    }
    if (!draft.preheader.trim() && def.key !== "campaign_default") {
        out.push({ level: "warn", message: "No preheader — inboxes will show the first line of the message instead." });
    }
    if (draft.ctaLabel?.trim() && !draft.ctaUrl?.trim()) {
        out.push({ level: "error", message: "The button has no link." });
    }
    if (draft.ctaUrl?.trim() && !/^https?:\/\/|^\{\{/.test(draft.ctaUrl.trim())) {
        out.push({ level: "error", message: "The button link must be a full URL or a variable." });
    }

    const links = (draft.body.match(/\]\(/g) ?? []).length;
    if (links > 6) {
        out.push({ level: "warn", message: `${links} links in one email reads as bulk mail.` });
    }

    return out;
}

export function hasBlockingError(warnings: TemplateWarning[]): boolean {
    return warnings.some((w) => w.level === "error");
}
