import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    href?: string;
    prefetch?: boolean;
    width?: number;
    height?: number;
}

export default function Logo({ className, href = "/", prefetch = false, width = 100, height = 34.8 }: LogoProps) {
    // The image is only ~35px tall — short of the 44px minimum tap target, which
    // made the logo fiddly to hit on phones. The link grows to 44 without the
    // artwork changing size.
    return (
        <Link href={href} className={cn("flex items-center justify-center min-h-[44px]", className)} prefetch={prefetch}>
            <Image src="/logo.png" alt="Givny" width={width} height={height} />
            <span className="sr-only">Givny</span>
        </Link>
    )
}