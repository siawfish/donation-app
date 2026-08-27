"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

/**
 * Meta Pixel.
 *
 * The snippet Meta gives you fires `PageView` once, when the script loads. That
 * is correct for a site of separate documents and wrong for this one: almost
 * every navigation here is client-side, so the browser never reloads and Meta
 * would record a single page view per session no matter how far someone got.
 * The effect below fires it again on each route change.
 */

/** Public by nature — it ships in the HTML — but overridable per environment. */
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2143921036159145";

/*
 * There is deliberately no <noscript> fallback.
 *
 * Meta's snippet ships one, and it is right for a server-rendered site. Here it
 * was firing *in addition to* the script and counting every visit twice: React
 * re-creates the element during hydration, at which point the browser treats it
 * as ordinary DOM and loads the image regardless of scripts being enabled.
 * Measured: two PageView beacons per page load, one of them `noscript=1`.
 *
 * Keeping it would also measure nothing worth having. This app is a React
 * client application — with JavaScript off it renders a loading state and
 * nothing else — so a "visit" it could record is not a visit anyone made.
 */

declare global {
    interface Window {
        fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
        _fbq?: unknown;
    }
}

function PageViewOnNavigate() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // The first PageView comes from the snippet itself, and this effect also
        // runs on mount — so the very first load reports twice unless it is
        // skipped. `fbq` is undefined until the script loads, which is exactly
        // the mount case, so that check does the job on its own.
        if (typeof window === "undefined" || !window.fbq) return;
        window.fbq("track", "PageView");
    }, [pathname, searchParams]);

    return null;
}

export function MetaPixel() {
    if (!PIXEL_ID) return null;

    return (
        <>
            <Script id="meta-pixel" strategy="afterInteractive">
                {`
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${PIXEL_ID}');
                    fbq('track', 'PageView');
                `}
            </Script>

            <PageViewOnNavigate />
        </>
    );
}

/**
 * Report a standard or custom event.
 *
 * Safe to call before the script has loaded and safe on the server: it does
 * nothing rather than throwing, so a call site never needs to guard.
 *
 *   trackPixelEvent("CompleteRegistration");
 *   trackPixelEvent("Lead", { content_name: "contact form" });
 */
export function trackPixelEvent(event: string, params?: Record<string, unknown>): void {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", event, params);
}
