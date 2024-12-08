import type { Metadata } from "next";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import "./globals.css";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { toUser } from "@/firebase/user";
import { AuthProvider } from "@/firebase/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner"
import { authConfig } from "@/firebase/config/server-config";
import Script from 'next/script';

export const metadata: Metadata = {
  title: "Givny",
  description: "Discover Givny.com, a platform connecting donors and seekers of pre-loved items. Easily list items you want to give away or browse available listings by category, location, and more. Create an account to manage your profile, save items, and connect with listers through messages. Whether you’re donating or finding something new, Givny makes it simple and community-driven.",
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
            </NuqsAdapter>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
