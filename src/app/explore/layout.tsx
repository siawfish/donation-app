import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { ItemDetails } from "@/components/ItemDetails";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 py-6 lg:py-12 flex justify-center">
        <Suspense>
          {children}
        </Suspense>
      </div>
      <Footer />
      {/* Item Details */}
      <ItemDetails />
    </div>
  );
}
