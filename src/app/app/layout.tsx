import type { Metadata } from "next";
import Navbar from "@/components/ui/navbar";

export const metadata: Metadata = {
  title: "Good Samaritan Account",
  description: "Good Samaritan Account for Donations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-secondary min-h-screen">
        <Navbar />
        {children}
    </div>
  );
}
