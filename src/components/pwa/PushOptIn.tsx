"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Info, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/firebase/auth/AuthContext";
import {
    getExistingSubscription, subscribeToPush, unsubscribeFromPush, vapidConfigured,
} from "@/lib/pushClient";
import {
    isPushRegistered, registerPushSubscription, unregisterPushSubscription,
} from "@/app/app/actions/push";
import type { WebPushSubscription } from "@/lib/webpush.types";
import { pushBlockedReason } from "@/lib/push";

/**
 * Opt-in control for push notifications.
 *
 * Lives in settings rather than firing on load. A permission request people
 * didn't ask for is the fastest way to get permanently denied — and a denial
 * cannot be undone from the page, only from browser settings.
 */
export function PushOptIn() {
    const { user } = useAuth();
    const [on, setOn] = useState(false);
    const [subscription, setSubscription] = useState<WebPushSubscription | null>(null);
    const [busy, setBusy] = useState(false);
    const [checked, setChecked] = useState(false);
    const [blocked, setBlocked] = useState<string | null>(null);

    // Reflect reality on mount: permission may have been revoked in browser
    // settings, or the app reinstalled, since the last visit.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setBlocked(pushBlockedReason());
            const existing = await getExistingSubscription();
            if (cancelled) return;
            setSubscription(existing);
            if (existing) setOn(await isPushRegistered(existing.endpoint));
            setChecked(true);
        })();
        return () => { cancelled = true };
    }, [user?.uid]);

    // The push service can retire a subscription on its own. The worker tells
    // us when that happens; re-subscribing quietly is the whole fix, and doing
    // nothing would mean notifications simply stopping with no clue why.
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        const onMessage = async (event: MessageEvent) => {
            if (event.data?.type !== "push-subscription-changed") return;
            const res = await subscribeToPush();
            if (!res.ok) return;
            await registerPushSubscription(res.subscription, navigator.userAgent.slice(0, 60));
            setSubscription(res.subscription);
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }, []);

    const enable = useCallback(async () => {
        setBusy(true);
        try {
            const res = await subscribeToPush();
            if (!res.ok) { toast.error(res.reason); setBlocked(pushBlockedReason()); return; }
            const saved = await registerPushSubscription(res.subscription, navigator.userAgent.slice(0, 60));
            if (!saved.success) { toast.error(saved.message); return; }
            setSubscription(res.subscription);
            setOn(true);
            toast.success("Notifications are on");
        } finally {
            setBusy(false);
        }
    }, []);

    const disable = useCallback(async () => {
        if (!subscription) return;
        setBusy(true);
        try {
            const res = await unregisterPushSubscription(subscription.endpoint);
            if (!res.success) { toast.error(res.message); return; }
            // Dropped in the browser too. Leaving it subscribed means the push
            // service keeps accepting messages for an endpoint we no longer
            // send to — harmless, but it is not really "off".
            await unsubscribeFromPush();
            setSubscription(null);
            setOn(false);
            toast.success("Notifications are off");
        } finally {
            setBusy(false);
        }
    }, [subscription]);

    if (!user) return null;

    const unconfigured = !vapidConfigured();

    return (
        <div className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-base font-bold text-ink flex items-center gap-2">
                        {on ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                        Notifications
                    </p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-prose">
                        Get told when someone asks for your item, when a request is accepted, and when a
                        handover is confirmed. Nothing else — no marketing.
                    </p>
                </div>

                {!blocked && !unconfigured && checked && (
                    <button
                        role="switch"
                        aria-checked={on}
                        aria-label="Push notifications"
                        disabled={busy}
                        onClick={() => (on ? disable() : enable())}
                        className={`relative w-14 h-8 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${
                            on ? "bg-forest" : "bg-gray-300"
                        }`}
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white absolute top-2 left-5" />
                        ) : (
                            <span
                                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                                    on ? "left-7" : "left-1"
                                }`}
                            />
                        )}
                    </button>
                )}
            </div>

            {/* Each unavailable case gets its own explanation — "install it
                first" and "you blocked it" need different responses. */}
            {blocked && (
                <p className="flex gap-2 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 leading-relaxed">
                    <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{blocked}</span>
                </p>
            )}

            {!blocked && unconfigured && (
                <p className="flex gap-2 mt-4 text-sm text-gray-500 bg-sand border border-gray-200 rounded-2xl px-4 py-3 leading-relaxed">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                        Push isn&rsquo;t switched on for this site yet. An admin needs to add the VAPID
                        keys to the environment.
                    </span>
                </p>
            )}

            {on && (
                <p className="text-xs text-gray-400 mt-3">
                    This device is registered. Turning it off here only affects this device.
                </p>
            )}
        </div>
    );
}
