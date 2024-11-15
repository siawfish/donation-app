import { UserTypes } from "@/app/types";
import { toUser } from "@/firebase/user";
import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react"
import { authConfig } from "@/firebase/config/server-config";
export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
    const tokens = await getTokens(await cookies(), {
      ...authConfig,
      headers: await headers()
    });
    const user = tokens ? await toUser(tokens) : null;
    if(user && user.userType === UserTypes.DONOR) {
        return redirect('/app/donor/add-item')
    }
    return (
        <>
            {children}
        </>
    )
}
