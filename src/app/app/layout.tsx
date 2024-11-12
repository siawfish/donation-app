import type { Metadata } from "next";
import Navbar from "@/components/ui/navbar";
import { ItemDetails } from "@/components/ItemDetails";

export const metadata: Metadata = {
  title: "User Dashboard",
  description: "User Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar />
      <div className="flex-1 py-6 lg:py-12 flex justify-center">
        {children}
      </div>
      {/* Item Details */}
      <ItemDetails />
    </div>
  );
}
