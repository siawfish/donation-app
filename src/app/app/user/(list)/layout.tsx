import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileSidePane } from "@/components/ProfileSidePane";
import ProfileTabs from "@/components/ProfileTabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="container max-w-8xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[80%_20%] gap-4">
        <div className="flex flex-col gap-6">
          
          <ProfileHeader />

          <ProfileTabs>
            {children}
          </ProfileTabs>
        </div>
        <ProfileSidePane />
      </div>
    </div>
  );
}