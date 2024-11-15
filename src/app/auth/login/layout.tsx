import { UserTypes } from "@/app/types";
import { toUser } from "@/firebase/user";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react"

export default async function Layout({ children }: { children: React.ReactNode }) {
    const tokens = await getTokens(await cookies(), {
      ...authConfig,
      headers: await headers()
    });
    const user = tokens ? await toUser(tokens) : null;
    if(user){
        const redirectUrl = user.userType === UserTypes.DONOR ? '/app/donor/my-items' : '/app/user/my-requests'
        return redirect(redirectUrl)
    }
    return (
        <>
            {children}
        </>
    )
}
