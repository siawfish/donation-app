import { LandingPage } from "@/components/LandingPage";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Givny",
  description: "Discover Givny.com, a platform connecting donors and seekers of pre-loved items. Easily list items you want to give away or browse available listings by category, location, and more. Create an account to manage your profile, save items, and connect with listers through messages. Whether you’re donating or finding something new, Givny makes it simple and community-driven.",
};

export default async function Home() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
