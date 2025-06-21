import Navbar from "@/components/ui/navbar";
import { ItemDetails } from "@/components/ItemDetails";
import { Suspense } from "react";
import FloatingBottomNavigation from "@/components/FloatingBottomNavigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="container max-w-7xl mx-auto py-6 lg:py-12">
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
