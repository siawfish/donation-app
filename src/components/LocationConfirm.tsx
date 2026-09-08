"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Check, Loader2, MapPin, RotateCw, Settings } from "lucide-react";
import { geoHelpFor, type GeoHelp } from "@/lib/geoPermission";

const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });

interface Props {
    lat?: number;
    lng?: number;
    locationName?: string;
    onChange: (lat: number, lng: number, locationName: string) => void;
    disabled?: boolean;
}

const coordLabel = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; resolved: boolean }> {
    try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (typeof data?.name === "string") return { name: data.name, resolved: data.resolved === true };
    } catch {
        /* falls through to coordinates */
    }
    return { name: coordLabel(lat, lng), resolved: false };
}

/**
 * A modal explaining how to switch location back on.
 *
 * A WEB PAGE CANNOT OPEN THE PHONE'S SETTINGS APP. There is no API: the iOS
 * `App-Prefs:` scheme was removed years ago and Android intents are blocked
 * from the browser. A button claiming to take somebody there would simply do
 * nothing, which is worse than not offering one.
 *
 * So this does the next best thing and the only honest one — it works out which
 * device is in front of the person and gives them the exact taps, in order.
 */
function PermissionHelp({
    help,
    onRetry,
    onManual,
    onClose,
    retrying,
}: {
    help: GeoHelp;
    onRetry: () => void;
    onManual: () => void;
    onClose: () => void;
    retrying: boolean;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="geo-help-title"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-5 h-5 text-amber-600" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="geo-help-title" className="text-base font-bold text-ink">{help.title}</h2>
                        <p className="text-sm text-gray-500 leading-snug mt-0.5">
                            Location is switched off for this site, so we can&rsquo;t suggest your area.
                            Your browser won&rsquo;t let a web page open Settings for you, so here are the taps.
                        </p>
                    </div>
                </div>

                <ol className="space-y-2.5">
                    {help.steps.map((step, i) => (
                        <li key={step} className="flex gap-3 text-sm text-ink leading-snug">
                            <span className="w-5 h-5 rounded-full bg-forest text-lime text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {i + 1}
                            </span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>

                {help.note && (
                    <p className="text-xs text-gray-500 bg-sand rounded-2xl px-4 py-3 leading-relaxed">
                        {help.note}
                    </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={retrying}
                        className="w-full inline-flex items-center justify-center gap-2 bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
                    >
                        {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                        I&rsquo;ve turned it on — try again
                    </button>
                    <button
                        type="button"
                        onClick={onManual}
                        className="w-full text-sm text-gray-600 font-medium px-6 py-3 rounded-full hover:bg-gray-50 transition-colors"
                    >
                        Set my area on a map instead
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Ask where somebody is, by telling them and letting them agree.
 *
 * This replaces dropping a pin on a map at signup. Almost everybody is signing
 * up from the place they want listings near, so the fastest correct path is to
 * read the location, name it, and let one tap confirm it. The map is still
 * there, but as the fallback it should always have been rather than the first
 * thing a new member is asked to operate.
 */
export default function LocationConfirm({ lat, lng, locationName, onChange, disabled }: Props) {
    const [status, setStatus] = useState<"idle" | "locating" | "suggested" | "denied" | "failed">("idle");
    const [suggestion, setSuggestion] = useState<{ lat: number; lng: number; name: string; resolved: boolean } | null>(null);
    const [help, setHelp] = useState<GeoHelp | null>(null);
    const [manual, setManual] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(!!locationName);

    const alive = useRef(true);
    const pending = useRef(false);
    const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Set on the way in as well as cleared on the way out. React StrictMode
    // mounts, unmounts and remounts in development, so a flag only ever set to
    // false stays false for the rest of the component's life — every callback
    // then returns early and the spinner never resolves.
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            if (watchdog.current) clearTimeout(watchdog.current);
        };
    }, []);

    const locate = useCallback(() => {
        setError(null);
        if (!navigator.geolocation) {
            setStatus("failed");
            setError("This browser can't share your location.");
            return;
        }

        setStatus("locating");

        // Our own timer, because `timeout` below does not cover the part that
        // actually hangs. While the browser's permission prompt is open the
        // geolocation timeout is not running, so somebody who ignores the
        // prompt — or whose browser suppresses it under a policy — gets
        // neither callback and sits on a spinner with no way forward. That was
        // the exact trap the old map had.
        if (watchdog.current) clearTimeout(watchdog.current);
        watchdog.current = setTimeout(() => {
            if (!alive.current || !pending.current) return;
            pending.current = false;
            setError("We didn't hear back from your browser. It may still be waiting on a permission prompt.");
            setStatus("failed");
        }, 15000);

        // Guards both directions: the watchdog must not fire once a callback
        // has run, and a callback arriving after the watchdog gave up must not
        // yank the person out of the fallback they have already started using.
        pending.current = true;
        const settle = (): boolean => {
            if (watchdog.current) { clearTimeout(watchdog.current); watchdog.current = null; }
            if (!pending.current) return false;
            pending.current = false;
            return true;
        };

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                if (!settle() || !alive.current) return;
                const { latitude, longitude } = pos.coords;
                const place = await reverseGeocode(latitude, longitude);
                if (!alive.current) return;
                setSuggestion({ lat: latitude, lng: longitude, name: place.name, resolved: place.resolved });
                setStatus("suggested");
                setHelp(null);
            },
            (err) => {
                if (!settle() || !alive.current) return;
                if (err.code === err.PERMISSION_DENIED) {
                    setStatus("denied");
                    setHelp(geoHelpFor());
                    return;
                }
                setStatus("failed");
                setError(
                    err.code === err.TIMEOUT
                        ? "That took too long."
                        : "We couldn't work out where you are."
                );
            },
            { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
        );
    }, []);

    // Asked as soon as this step opens rather than behind a button. The person
    // has just been shown a heading that says "Your area", so the browser's
    // prompt arrives with obvious context — which is exactly when it is most
    // likely to be allowed, and a denial here is permanent.
    useEffect(() => {
        if (!confirmed) locate();
    }, [confirmed, locate]);

    const accept = () => {
        if (!suggestion) return;
        onChange(suggestion.lat, suggestion.lng, suggestion.name);
        setConfirmed(true);
    };

    /* Confirmed ─────────────────────────────────────────────────────────── */
    if (confirmed && !manual) {
        return (
            <div className="space-y-3">
                <label className="block text-sm font-semibold text-ink">Your area</label>
                <div className="flex items-center gap-3 bg-lime/40 border border-forest/10 rounded-2xl px-4 py-4">
                    <span className="w-9 h-9 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-lime" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{locationName || suggestion?.name}</p>
                        <p className="text-xs text-gray-500">We&rsquo;ll show you things near here first.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { setConfirmed(false); setManual(true); }}
                    disabled={disabled}
                    className="text-sm text-primary font-medium hover:underline"
                >
                    Change my area
                </button>
            </div>
        );
    }

    /* Map fallback ──────────────────────────────────────────────────────── */
    if (manual) {
        return (
            <div className="space-y-3">
                <LocationPicker
                    lat={lat || suggestion?.lat}
                    lng={lng || suggestion?.lng}
                    locationName={locationName}
                    disabled={disabled}
                    onChange={(a, b, n) => { onChange(a, b, n); setConfirmed(true); }}
                />
                <button
                    type="button"
                    onClick={() => { setManual(false); locate(); }}
                    className="text-sm text-primary font-medium hover:underline"
                >
                    ← Use my current location instead
                </button>
            </div>
        );
    }

    /* Locating, suggesting, or failed ───────────────────────────────────── */
    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Your area</label>

            {status === "locating" && (
                <div className="flex items-center gap-3 bg-white border border-gray-200/80 rounded-2xl px-4 py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                    <p className="text-sm text-gray-600">Working out where you are…</p>
                </div>
            )}

            {status === "suggested" && suggestion && (
                <>
                    <div className="bg-white border border-gray-200/80 rounded-2xl px-4 py-4 space-y-1">
                        <p className="text-xs text-gray-500">It looks like you&rsquo;re in</p>
                        <p className="flex items-center gap-2 text-base font-bold text-ink">
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="truncate">{suggestion.name}</span>
                        </p>
                        {/* When the lookup only produced coordinates, saying so
                            is better than presenting numbers as a place name. */}
                        {!suggestion.resolved && (
                            <p className="text-xs text-amber-700">
                                We couldn&rsquo;t name that spot, so it&rsquo;s shown as coordinates. It still works.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={accept}
                        disabled={disabled}
                        className="w-full inline-flex items-center justify-center gap-2 bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
                    >
                        <Check className="w-4 h-4" />
                        Yes, that&rsquo;s right
                    </button>

                    <div className="flex items-center justify-between">
                        <button type="button" onClick={locate} className="text-sm text-gray-500 font-medium hover:text-gray-700">
                            Try again
                        </button>
                        <button type="button" onClick={() => setManual(true)} className="text-sm text-primary font-medium hover:underline">
                            Pick a different spot
                        </button>
                    </div>
                </>
            )}

            {(status === "denied" || status === "failed") && (
                <div className="space-y-3">
                    <p className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 leading-relaxed">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                            {status === "denied"
                                ? "We can't see your location — it's switched off for this site."
                                : error}
                        </span>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={() => (status === "denied" ? setHelp(geoHelpFor()) : locate())}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all"
                        >
                            {status === "denied" ? <Settings className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
                            {status === "denied" ? "Show me how to turn it on" : "Try again"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setManual(true)}
                            className="flex-1 text-sm text-gray-600 font-medium px-6 py-3.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Set it on a map
                        </button>
                    </div>
                </div>
            )}

            {help && (
                <PermissionHelp
                    help={help}
                    retrying={status === "locating"}
                    onRetry={() => { setHelp(null); locate(); }}
                    onManual={() => { setHelp(null); setManual(true); }}
                    onClose={() => setHelp(null)}
                />
            )}
        </div>
    );
}
