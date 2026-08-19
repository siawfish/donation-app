"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "givny:install-dismissed";

/**
 * Registers the service worker and offers an install affordance.
 *
 * Two paths, because the platforms differ: Chromium fires `beforeinstallprompt`
 * and gives us a real install dialog; iOS Safari has no such API, so the only
 * honest option there is to point at Share -> Add to Home Screen.
 */
export function InstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if ("serviceWorker" in navigator) {
            if (process.env.NODE_ENV === "production") {
                // Registered after load so it never competes with the first paint.
                const register = () =>
                    navigator.serviceWorker.register("/sw.js").catch(() => {
                        /* SW is an enhancement; the app works fine without it */
                    });
                if (document.readyState === "complete") register();
                else window.addEventListener("load", register, { once: true });
            } else {
                // Never run the worker in development, and actively undo it for
                // anyone who already has it. Next reuses chunk filenames in dev
                // instead of content-hashing them, so the worker's cache-first
                // rule pins the first build it ever saw and the browser keeps
                // executing stale JavaScript — surviving new tabs, server
                // restarts and even deleting .next.
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => registration.unregister());
                });
                if (typeof caches !== "undefined") {
                    caches.keys().then((keys) =>
                        keys.filter((k) => k.startsWith("givny-")).forEach((k) => caches.delete(k))
                    );
                }
            }
        }

        // Already installed — nothing to offer.
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;
        if (standalone) return;

        if (localStorage.getItem(DISMISS_KEY)) return;

        const onPrompt = (e: Event) => {
            e.preventDefault(); // stop Chrome's own mini-infobar; we show our own
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };
        window.addEventListener("beforeinstallprompt", onPrompt);

        // iOS never fires the event, so detect it and show the manual route.
        const ua = window.navigator.userAgent;
        const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        if (isIos) {
            setShowIosHint(true);
            setVisible(true);
        }

        return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    }, []);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
    };

    const install = async () => {
        if (!deferred) return;
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setVisible(false);
        // Chrome only lets the event be used once
        setDeferred(null);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-[calc(1rem+var(--safe-bottom))] inset-x-4 z-[60] flex justify-center pointer-events-none">
            <div className="forest-panel pointer-events-auto w-full max-w-md rounded-3xl p-4 shadow-2xl shadow-forest/40 flex items-center gap-3.5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-lime text-forest flex-shrink-0">
                    <Download className="w-5 h-5" />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white leading-tight">Add Givny to your home screen</p>
                    {showIosHint ? (
                        <p className="text-[11px] text-white/60 mt-1 leading-snug">
                            Tap <Share className="inline w-3 h-3 mx-0.5 -mt-0.5" /> Share, then
                            &ldquo;Add to Home Screen&rdquo;.
                        </p>
                    ) : (
                        <p className="text-[11px] text-white/60 mt-1 leading-snug">
                            Faster to open, and works even when you&apos;re offline.
                        </p>
                    )}
                </div>

                {!showIosHint && (
                    <button
                        onClick={install}
                        className="flex-shrink-0 bg-lime text-forest text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all"
                    >
                        Install
                    </button>
                )}

                <button
                    onClick={dismiss}
                    aria-label="Dismiss install prompt"
                    className="flex-shrink-0 w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
