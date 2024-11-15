import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileSidePane } from "@/components/ProfileSidePane";
import ProfileTabs from "@/components/ProfileTabs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donor Profile",
  description: "Donor profile",
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