import type { Metadata } from "next";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Givny",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
        </Suspense>
      </body>
    </html>
  );
}
