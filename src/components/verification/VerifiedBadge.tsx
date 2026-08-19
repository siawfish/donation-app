import { BadgeCheck } from "lucide-react";

/**
 * Shown wherever a member is represented. Deliberately understated — it should
 * read as a quiet fact, not a rosette.
 */
export function VerifiedBadge({
    size = "sm",
    withLabel = false,
    className = "",
}: {
    size?: "xs" | "sm" | "lg";
    withLabel?: boolean;
    className?: string;
}) {
    const icon = size === "xs" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4";

    if (!withLabel) {
        return (
            <span title="Identity verified" className={`inline-flex text-primary ${className}`}>
                <BadgeCheck className={icon} aria-label="Verified member" />
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 bg-primary-light text-primary font-bold rounded-full px-2.5 py-1 ${
                size === "lg" ? "text-xs" : "text-[11px]"
            } ${className}`}
        >
            <BadgeCheck className={icon} />
            Verified
        </span>
    );
}
