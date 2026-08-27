import type { Metadata, Viewport } from "next";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import "./globals.css";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { toUser } from "@/firebase/user";
import { AuthProvider } from "@/firebase/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { authConfig } from "@/firebase/config/server-config";
import Script from 'next/script';
import { MetaPixel } from '@/components/MetaPixel';

export const metadata: Metadata = {
  title: "Givny — give your things a second life",
  description:
    "Givny is a free community marketplace for passing things on. Find what you need from neighbours nearby, or give something you no longer use a second life. No money, no fees, ever — just less waste and more use out of what already exists.",
  manifest: "/manifest.webmanifest",
  applicationName: "Givny",
  appleWebApp: {
    capable: true,
    title: "Givny",
    // Lets the forest panel run under the iOS status bar
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0C3B2E",
  width: "device-width",
  initialScale: 1,
  // Installed apps shouldn't rubber-band like a web page
  viewportFit: "cover",
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
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6VYC0TTX9K"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-6VYC0TTX9K');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "oyzg9ybknl");
          `}
        </Script>

        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </head>
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthProvider user={user}>
            <NuqsAdapter>
              <main>
                {children}
              </main>
              <Toaster
                position="bottom-left"
              />
              <InstallPrompt />
            </NuqsAdapter>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
