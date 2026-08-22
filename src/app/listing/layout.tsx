import PublicShell from "@/components/PublicShell";

/**
 * A shared listing is often someone's first ever Givny page, arriving from a
 * WhatsApp message. Without the shell there is no nav, no footer and no way to
 * reach the rest of the site — the link is a dead end.
 */
export default function ListingLayout({ children }: { children: React.ReactNode }) {
    return <PublicShell>{children}</PublicShell>;
}
