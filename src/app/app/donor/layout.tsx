"use client";
import { UserTypes } from "@/app/types";
import { useAuth } from "@/firebase/auth/AuthContext";
import { redirect, usePathname } from "next/navigation";

export default function UserLayout({children}: {children: React.ReactNode}) {
    const pathname = usePathname();
    const { user } = useAuth();
    
    if (pathname.startsWith('/app/donor') && user?.userType !== UserTypes.DONOR) {
        redirect(`/app/${user?.userType}`);
    }

    return <>{children}</>;
}