"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Info, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/firebase/auth/AuthContext";
import {
    getExistingPushToken, onForegroundMessage, requestPushToken, vapidConfigured,
} from "@/firebase/auth/messaging";
import { isPushRegistered, registerPushToken, unregisterPushToken } from "@/app/app/actions/push";
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
    const [token, setToken] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [checked, setChecked] = useState(false);
    const [blocked, setBlocked] = useState<string | null>(null);

    // Reflect reality on mount: permission may have been revoked in browser
    // settings, or the app reinstalled, since the last visit.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setBlocked(pushBlockedReason());
            const existing = await getExistingPushToken();
            if (cancelled) return;
            setToken(existing);
            if (existing) setOn(await isPushRegistered(existing));
            setChecked(true);
        })();
        return () => { cancelled = true };
    }, [user?.uid]);

    // A message arriving while the app is open never reaches the service
    // worker, so show it in-app instead of dropping it.
    useEffect(() => {
        let unsub: (() => void) | undefined;
        onForegroundMessage(({ title, body, url }) => {
            toast(title || "Givny", {
                description: body,
                action: url ? { label: "Open", onClick: () => (window.location.href = url) } : undefined,
            });
        }).then((fn) => (unsub = fn));
        return () => unsub?.();
    }, []);

    const enable = useCallback(async () => {
        setBusy(true);
        try {
            const res = await requestPushToken();
            if (!res.ok) { toast.error(res.reason); setBlocked(pushBlockedReason()); return; }
            const saved = await registerPushToken(res.token, navigator.userAgent.slice(0, 60));
            if (!saved.success) { toast.error(saved.message); return; }
            setToken(res.token);
            setOn(true);
            toast.success("Notifications are on");
        } finally {
            setBusy(false);
        }
    }, []);

    const disable = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const res = await unregisterPushToken(token);
            if (!res.success) { toast.error(res.message); return; }
            setOn(false);
            toast.success("Notifications are off");
        } finally {
            setBusy(false);
        }
    }, [token]);

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
                        Push isn&rsquo;t switched on for this site yet. An admin needs to add the Web Push
                        key from Firebase to the environment.
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
