import { LandingPage } from "@/components/landing-page";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
