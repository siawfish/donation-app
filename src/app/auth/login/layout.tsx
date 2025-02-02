import { toUser } from "@/firebase/user";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react"

interface LayoutProps {
    children: React.ReactNode;
}

export default async function Layout({
    children,
}: LayoutProps) {
    const tokens = await getTokens(await cookies(), {
      ...authConfig,
      headers: await headers()
    });
    const user = tokens ? await toUser(tokens) : null;
    if(user){
        return redirect('/app')
    }
    return children;
}
