import React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAuth, User } from "@/firebase/auth/AuthContext";

export function WelcomeMessage() {
    const { user } = useAuth();
    return (
        <div className="text-4xl font-cabinetLight tracking-tight flex flex-row flex-wrap items-center gap-2">
            <span>Welcome, </span>
            <Avatar className="w-10 h-10 bg-white">
                <AvatarFallback className="bg-white border border-gray-200">
                    <span className="text-base font-cabinet text-muted-foreground">{getInitials(user?.displayName ?? '')}</span>
                </AvatarFallback>
            </Avatar>
            <span className="font-cabinet">{user?.displayName}</span>
        </div>
    )
}