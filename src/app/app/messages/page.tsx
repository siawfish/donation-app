import Messages from "@/components/Messages";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config/server-config";
import { toUser } from "@/firebase/user";
import { cookies, headers } from "next/headers";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tokens = await getTokens(await cookies(), {
      ...authConfig,
      headers: await headers()
  });
  const user = tokens ? await toUser(tokens) : null;
  return {
      title: `Messaging - ${user?.displayName}`,
      description: `Messages for ${user?.displayName}`,
  }
}

export default async function MessagesPage() {
    return <Messages />
}