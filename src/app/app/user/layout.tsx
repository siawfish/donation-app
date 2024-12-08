import { UserTypes } from "@/app/types";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config/server-config";
import { toUser } from "@/firebase/user";
import { redirect } from "next/navigation";

export default async function UserLayout({children}: {children: React.ReactNode}) {
    const pathname = headers().get("x-pathname") || "/";
    const tokens = await getTokens(await cookies(), {
        ...authConfig,
        headers: await headers()
    });
    const user = tokens ? await toUser(tokens) : null;
    
    if (pathname.startsWith('/app/user') && user?.userType !== UserTypes.USER) {
        redirect(`/app/${user?.userType}`);
    }

    return <>{children}</>;
}