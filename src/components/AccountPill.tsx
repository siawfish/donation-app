'use client'

import { Badge } from "./ui/badge";
import { UserIcon, Building2Icon } from "lucide-react";
import { useAuth } from "@/firebase/auth/AuthContext";
import { AccountTypes, UserTypes } from "@/app/types";

export function AccountPill() {
    const { user } = useAuth();
    return (
        <Badge className="text-xs font-cabinet text-black w-fit pr-4 flex flex-row items-center border-black bg-white uppercase border-[1.5px] gap-1" variant="default">
                <span>
                {
                    user?.type === AccountTypes.INDIVIDUAL && (
                        <UserIcon className="w-4 h-4" />
                    )
                }
                {
                    user?.type === AccountTypes.ORGANIZATION && (
                        <Building2Icon className="w-4 h-4" />
                    )
                }
                </span>
            <span className="mt-[2px]">{user?.type}</span>
        </Badge>
    )
}