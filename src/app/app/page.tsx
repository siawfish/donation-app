import Dashboard from "@/components/Dashboard";
import { authConfig } from "@/firebase/config/server-config";
import { toUser } from "@/firebase/user";
import { Metadata } from "next";
import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
    const tokens = await getTokens(await cookies(), {
        ...authConfig,
        headers: await headers()
    });
    const user = tokens ? await toUser(tokens) : null;
    return {
        title: `Dashboard - ${user?.displayName}`,
        description: `Dashboard for ${user?.displayName}`,
    }
}

export default async function Page() {

  return <Dashboard />;
}
