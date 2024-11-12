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
    return (
        <Link href={href} className={cn("flex items-center justify-center", className)} prefetch={prefetch}>
            <Image src="/logo.png" alt="Givny" width={width} height={height} />
            <span className="sr-only">Givny</span>
        </Link>
    )
}