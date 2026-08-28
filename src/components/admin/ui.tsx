/**
 * Admin design primitives.
 *
 * The public app is soft and rounded — pill buttons, 24px radii, lots of air.
 * That reads as friendly on a listing and as unserious on an operations screen,
 * where the job is to scan a lot of rows and act on them. These primitives are
 * deliberately a different register: small radii on rectangles, hairline
 * borders, a neutral grey chrome with forest reserved for emphasis, and rows
 * tight enough to fit roughly twice the data on a screen.
 *
 * No hooks here on purpose, so the same primitives render in both server and
 * client admin components.
 */

import * as React from "react";

/** Literal lookup: Tailwind cannot see class names built by interpolation. */
const ALIGN: Record<"left" | "right" | "center", string> = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
};

/* ── Surfaces ──────────────────────────────────────────────────────────── */

export function Panel({
    title,
    description,
    actions,
    children,
    flush,
    className = "",
}: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    /** Drop the body padding — tables manage their own. */
    flush?: boolean;
    className?: string;
}) {
    return (
        <section className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/70">
                    <div className="min-w-0">
                        {title && (
                            <h2 className="text-[13px] font-semibold text-ink leading-tight">{title}</h2>
                        )}
                        {description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
                </header>
            )}
            <div className={flush ? "" : "p-4"}>{children}</div>
        </section>
    );
}

/** Section label above a group of panels. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            {children}
        </h2>
    );
}

/* ── Table ─────────────────────────────────────────────────────────────── */

export function TableWrap({ children }: { children: React.ReactNode }) {
    // Tables scroll inside their own box; the page itself must never scroll
    // sideways.
    return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
    return <table className="w-full border-collapse text-[13px]">{children}</table>;
}

export function Th({
    children,
    align = "left",
    width,
    className = "",
}: {
    children?: React.ReactNode;
    align?: "left" | "right" | "center";
    width?: string;
    className?: string;
}) {
    return (
        <th
            style={width ? { width } : undefined}
            className={`sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 whitespace-nowrap ${ALIGN[align]} ${className}`}
        >
            {children}
        </th>
    );
}

export function Td({
    children,
    align = "left",
    className = "",
    colSpan,
}: {
    children?: React.ReactNode;
    align?: "left" | "right" | "center";
    className?: string;
    colSpan?: number;
}) {
    return (
        <td
            colSpan={colSpan}
            className={`border-b border-gray-100 px-3 py-2 align-middle ${ALIGN[align]} ${className}`}
        >
            {children}
        </td>
    );
}

export function Tr({
    children,
    muted,
    className = "",
}: {
    children: React.ReactNode;
    /** Row is de-emphasised — suspended, archived, closed. */
    muted?: boolean;
    className?: string;
}) {
    return (
        <tr className={`hover:bg-gray-50 transition-colors ${muted ? "bg-red-50/40" : ""} ${className}`}>
            {children}
        </tr>
    );
}

/** Numeric cells line up only if the figures are tabular. */
export function Num({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <span className={`tabular-nums ${className}`}>{children}</span>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-gray-400">
                {children}
            </td>
        </tr>
    );
}

export function SkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                    {Array.from({ length: cols }).map((__, c) => (
                        <td key={c} className="border-b border-gray-100 px-3 py-2.5">
                            <div className="h-3 rounded bg-gray-100 animate-pulse" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/* ── Controls ──────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "default" | "danger" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
    primary: "bg-forest text-white border-forest hover:bg-forest-dark",
    default: "bg-white text-ink border-gray-300 hover:bg-gray-50",
    danger: "bg-white text-red-600 border-gray-300 hover:bg-red-50 hover:border-red-300",
    ghost: "bg-transparent text-gray-600 border-transparent hover:bg-gray-100",
};

export function Button({
    variant = "default",
    size = "sm",
    className = "",
    children,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "xs";
}) {
    const pad = size === "xs" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs";
    return (
        <button
            {...rest}
            className={`inline-flex items-center gap-1.5 rounded-md border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${pad} ${BUTTON_STYLES[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

export function Input({
    className = "",
    ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...rest}
            className={`bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] text-ink placeholder-gray-400 outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors ${className}`}
        />
    );
}

export function Select({
    className = "",
    children,
    ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...rest}
            className={`bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-forest transition-colors ${className}`}
        >
            {children}
        </select>
    );
}

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            {...rest}
            className={`w-full bg-white border border-gray-300 rounded-md px-2.5 py-2 text-[13px] text-ink placeholder-gray-400 outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors resize-y ${className}`}
        />
    );
});

/** Segmented filter control — replaces the row of pill buttons. */
export function Segmented<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { id: T; label: string; count?: number }[];
    onChange: (id: T) => void;
}) {
    return (
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
            {options.map((o, i) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onChange(o.id)}
                    aria-pressed={value === o.id}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        i > 0 ? "border-l border-gray-300" : ""
                    } ${value === o.id ? "bg-forest text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                    {o.label}
                    {o.count != null && (
                        <span className={`ml-1.5 tabular-nums ${value === o.id ? "text-lime" : "text-gray-400"}`}>
                            {o.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

/* ── Status ────────────────────────────────────────────────────────────── */

export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "info" | "forest";

const BADGE_TONES: Record<BadgeTone, string> = {
    neutral: "bg-gray-100 text-gray-600 border-gray-200",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    forest: "bg-forest text-lime border-forest",
};

export function Badge({
    tone = "neutral",
    children,
    className = "",
}: {
    tone?: BadgeTone;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}
        >
            {children}
        </span>
    );
}

/** Small square avatar — rectangles read more like a record than a person. */
export function Initials({ name, size = 28 }: { name?: string; size?: number }) {
    const initials = (name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "?";
    return (
        <span
            style={{ width: size, height: size, fontSize: size * 0.36 }}
            className="inline-flex items-center justify-center rounded bg-forest text-lime font-semibold flex-shrink-0"
        >
            {initials}
        </span>
    );
}

/** Compact KPI cell for a metric strip. */
export function Stat({
    label,
    value,
    delta,
    hint,
}: {
    label: string;
    value: React.ReactNode;
    /** Percentage change; sign decides the colour. */
    delta?: number | null;
    hint?: string;
}) {
    return (
        <div className="px-4 py-3 border-r border-b border-gray-200 last:border-r-0 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 truncate">
                {label}
            </p>
            <p className="text-xl font-semibold text-ink tabular-nums mt-1 leading-none">{value}</p>
            <div className="mt-1.5 h-4 flex items-center gap-1.5">
                {delta != null && delta !== 0 && (
                    <span
                        className={`text-[11px] font-semibold tabular-nums whitespace-nowrap flex-shrink-0 ${
                            delta > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                        {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}%
                    </span>
                )}
                {hint && <span className="text-[11px] text-gray-400 truncate">{hint}</span>}
            </div>
        </div>
    );
}
