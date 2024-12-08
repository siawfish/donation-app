import type { Metadata } from "next";
import Navbar from "@/components/ui/navbar";
import { ItemDetails } from "@/components/ItemDetails";
import { Suspense } from "react";
import FloatingBottomNavigation from "@/components/FloatingBottomNavigation";
import { Notifications } from "@/components/Notifications";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col pb-20">
      <Navbar />
      <div className="flex-1 py-6 lg:py-12 flex justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
      </div>
      {/* Item Details */}
      <ItemDetails />
      <FloatingBottomNavigation />
    </div>
  );
}
