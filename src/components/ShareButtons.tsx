"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Sharing, ordered for Ghana rather than for a US tech blog.
 *
 * WhatsApp comes first and is not negotiable — it is where things actually get
 * passed around here. X and Facebook follow, LinkedIn only where a post is
 * plausibly professional. The native sheet takes over on phones that have one,
 * because it reaches the apps we cannot enumerate.
 */

export interface ShareTarget {
    id: string;
    label: string;
    href: (url: string, title: string) => string;
    /** Brand colour, used only on hover so the row stays calm at rest. */
    hover: string;
}

const TARGETS: ShareTarget[] = [
    {
        id: "whatsapp",
        label: "WhatsApp",
        href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
        hover: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
    {
        id: "x",
        label: "X",
        href: (url, title) =>
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        hover: "hover:bg-black hover:text-white hover:border-black",
    },
    {
        id: "facebook",
        label: "Facebook",
        href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        hover: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
        id: "linkedin",
        label: "LinkedIn",
        href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        hover: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
    },
];

function Glyph({ id }: { id: string }) {
    // Inline paths rather than an icon package: lucide has no brand marks, and
    // pulling in a brand-icon dependency for four glyphs is not worth the bytes.
    const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "currentColor" as const };
    switch (id) {
        case "whatsapp":
            return (
                <svg {...common} aria-hidden="true">
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.8h-.02a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.71.97.99-3.62-.23-.37a9.79 9.79 0 0 1-1.5-5.23c0-5.41 4.4-9.81 9.82-9.81 2.62 0 5.08 1.03 6.93 2.88a9.74 9.74 0 0 1 2.87 6.94c0 5.41-4.4 9.82-9.8 9.82m8.35-18.17A11.72 11.72 0 0 0 12.05 0C5.5 0 .18 5.33.18 11.88c0 2.1.55 4.14 1.59 5.95L.08 24l6.32-1.66a11.83 11.83 0 0 0 5.65 1.44h.01c6.54 0 11.87-5.33 11.87-11.88 0-3.17-1.24-6.15-3.48-8.39" />
                </svg>
            );
        case "x":
            return (
                <svg {...common} aria-hidden="true">
                    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.11z" />
                </svg>
            );
        case "facebook":
            return (
                <svg {...common} aria-hidden="true">
                    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07" />
                </svg>
            );
        case "linkedin":
            return (
                <svg {...common} aria-hidden="true">
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13m1.78 13.02H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0" />
                </svg>
            );
        default:
            return null;
    }
}

export function ShareButtons({
    url,
    title,
    /** LinkedIn is noise on a listing and useful on an article. */
    includeLinkedIn = true,
    label = "Share this",
}: {
    url: string;
    title: string;
    includeLinkedIn?: boolean;
    label?: string;
}) {
    const [copied, setCopied] = useState(false);
    // Decided after mount: reading navigator during render would make the
    // server and client disagree about whether this button exists.
    const [canShareNatively, setCanShareNatively] = useState(false);
    useEffect(() => { setCanShareNatively(typeof navigator !== "undefined" && "share" in navigator) }, []);

    const targets = TARGETS.filter((t) => includeLinkedIn || t.id !== "linkedin");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Couldn't copy — long-press the address bar instead.");
        }
    };

    const native = async () => {
        try {
            await navigator.share({ title, url });
        } catch {
            // A cancelled share sheet rejects too, so this stays silent.
        }
    };

    const chip =
        "inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border border-gray-200 text-gray-600 bg-white transition-colors";

    return (
        <div className="flex flex-wrap items-center gap-2">
            {label && (
                <span className="text-xs font-bold tracking-[0.12em] uppercase text-gray-400 mr-1">
                    {label}
                </span>
            )}

            {targets.map((t) => (
                <a
                    key={t.id}
                    href={t.href(url, title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${chip} ${t.hover}`}
                >
                    <Glyph id={t.id} />
                    <span className="hidden sm:inline">{t.label}</span>
                </a>
            ))}

            <button onClick={copy} className={`${chip} hover:border-forest/50 hover:text-forest`}>
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy link"}
            </button>

            {canShareNatively && (
                <button
                    onClick={native}
                    className={`${chip} sm:hidden hover:border-forest/50 hover:text-forest`}
                    aria-label="Share"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
