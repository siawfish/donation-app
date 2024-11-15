import { LandingPage } from "@/components/LandingPage";
import { Suspense } from "react";

export default async function Home() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
