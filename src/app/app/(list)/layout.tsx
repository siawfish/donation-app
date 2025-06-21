import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileSidePane } from "@/components/ProfileSidePane";
import ProfileTabs from "@/components/ProfileTabs";
import { Metadata } from "next";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config/server-config";
import { toUser } from "@/firebase/user";
import { cookies, headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const tokens = await getTokens(await cookies(), {
      ...authConfig,
      headers: await headers()
  });
  const user = tokens ? await toUser(tokens) : null;
  return {
      title: `Listings - ${user?.displayName}`,
      description: `Listings for ${user?.displayName}`,
  }
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileTabs>
      {children}
    </ProfileTabs>
  );
}