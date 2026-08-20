import PublicShell from "@/components/PublicShell";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    // flush: the storefront opens with a full-bleed cover image.
    return <PublicShell flush>{children}</PublicShell>;
}
