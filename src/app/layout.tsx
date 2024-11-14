import type { Metadata } from "next";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import "./globals.css";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config";
import { toUser } from "@/firebase/user";
import { AuthProvider } from "@/firebase/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Givny",
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tokens = await getTokens(await cookies(), {
    ...authConfig,
    headers: await headers()
  });
  const user = tokens ? await toUser(tokens) : null;
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthProvider user={user}>
            <NuqsAdapter>
              <main>
                {children}
              </main>
              <Toaster />
            </NuqsAdapter>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
