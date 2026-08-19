import Navbar from "@/components/ui/navbar";
import { redirect } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { authConfig } from "@/firebase/config/server-config";
import { db } from "@/firebase/init";
import { ItemDetails } from "@/components/ItemDetails";
import { Suspense } from "react";
import FloatingBottomNavigation from "@/components/FloatingBottomNavigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A suspended member keeps a valid session, so the block has to happen here
  // rather than at sign-in.
  const tokens = await getTokens(await cookies(), authConfig);
  if (tokens) {
    const snap = await db.collection("users").doc(tokens.decodedToken.uid).get();
    if (snap.data()?.suspended === true) redirect("/suspended");
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="container max-w-7xl mx-auto px-4 py-6 lg:py-10 pb-32">
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
      </div>
      {/* Item Details */}
      <ItemDetails />
      <Suspense>
        <FloatingBottomNavigation />
      </Suspense>
    </div>
  );
}
