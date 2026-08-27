/**
 * Helping someone turn location back on.
 *
 * A WEB PAGE CANNOT OPEN DEVICE SETTINGS. There is no API for it — `app-settings:`
 * works only from a native app, and every "open settings" link you find for the
 * web is either an Android intent that Chrome blocks or an iOS scheme Apple
 * removed years ago. Pretending otherwise produces a button that does nothing,
 * which is worse than no button.
 *
 * What we can do is know which device someone is on and tell them exactly which
 * taps to make. That is what this file is for: the steps are short, specific and
 * in the right order for the browser actually in front of them.
 */

export type GeoPermission = "granted" | "denied" | "prompt" | "unsupported";

export interface GeoHelp {
    /** Which set of instructions applies. */
    platform: "ios-safari" | "ios-other" | "android" | "desktop";
    title: string;
    steps: string[];
    /** Shown under the steps when the OS itself can be switched off too. */
    note?: string;
}

function isIos(ua: string, maxTouchPoints: number, platform: string): boolean {
    return (
        /iPad|iPhone|iPod/.test(ua) ||
        // iPadOS reports as a Mac; the touch points give it away.
        (platform === "MacIntel" && maxTouchPoints > 1)
    );
}

/**
 * Which device this is, and the taps that fix it.
 *
 * On iOS the browser permission and the system permission are two separate
 * switches, and people commonly fix one and give up when nothing changes — so
 * both are always listed, in the order they bite.
 */
export function geoHelpFor(
    ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
    maxTouchPoints: number = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
    platform: string = typeof navigator !== "undefined" ? navigator.platform : ""
): GeoHelp {
    const ios = isIos(ua, maxTouchPoints, platform);
    const chrome = /CriOS|Chrome/.test(ua);
    const android = /Android/.test(ua);

    if (ios && !chrome) {
        return {
            platform: "ios-safari",
            title: "Turn on location for Safari",
            steps: [
                "Open Settings, then scroll down to Safari",
                "Tap Location, then choose Ask or Allow",
                "Come back here and tap Use my location again",
            ],
            note:
                "If that is already set: Settings → Privacy & Security → Location Services must be on as well.",
        };
    }

    if (ios) {
        return {
            platform: "ios-other",
            title: "Turn on location for your browser",
            steps: [
                "Open Settings, then scroll to Chrome",
                "Tap Location, then choose While Using the App",
                "Come back here and tap Use my location again",
            ],
            note:
                "If that is already set: Settings → Privacy & Security → Location Services must be on as well.",
        };
    }

    if (android) {
        return {
            platform: "android",
            title: "Turn on location for this site",
            steps: [
                "Tap the lock or ⓘ icon beside the web address",
                "Tap Permissions, then Location, and allow it",
                "Reload the page and tap Use my location again",
            ],
            note:
                "If Location does not appear there, switch on Location in your phone's quick settings first.",
        };
    }

    return {
        platform: "desktop",
        title: "Turn on location for this site",
        steps: [
            "Click the lock icon beside the web address",
            "Set Location to Allow",
            "Reload the page and click Use my location again",
        ],
    };
}

/**
 * Ask the browser what it has already decided, without prompting.
 *
 * Safari only added the Permissions API for geolocation recently, and some
 * browsers throw on an unknown name, so a failure here means "we don't know"
 * rather than "not allowed" — never block the button on it.
 */
export async function readGeoPermission(): Promise<GeoPermission> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unsupported";
    if (!navigator.permissions?.query) return "prompt";

    try {
        const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        return status.state as GeoPermission;
    } catch {
        return "prompt";
    }
}
