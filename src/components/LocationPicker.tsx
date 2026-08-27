"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinIcon, LocateFixed, AlertCircle, Loader2, Check, Hand } from "lucide-react";
import { geoHelpFor, readGeoPermission, type GeoHelp } from "@/lib/geoPermission";
// Bundled rather than pulled from unpkg: this is an installable PWA, and a map
// whose stylesheet lives on a third-party CDN is a map that breaks offline or
// behind a restrictive network.
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  locationName?: string;
  onChange: (lat: number, lng: number, locationName: string) => void;
  disabled?: boolean;
}

/** Fallback label. Coordinates are a poor name, but better than an empty one. */
const coordLabel = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

/**
 * Turn coordinates into a short place name.
 *
 * Goes through our own /api/geocode rather than Nominatim directly: their usage
 * policy wants an identifying User-Agent that a browser cannot set, and caps
 * callers at about one request per second across the whole application — which
 * no amount of per-tab restraint can guarantee. The route also caches, so most
 * pins never reach Nominatim at all.
 *
 * The route always answers with this shape, including on 429 and upstream
 * failure, so there is no error path here beyond the network itself.
 */
async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<{ name: string; resolved: boolean }> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { signal });
    const data = await res.json();
    if (typeof data?.name === "string") {
      return { name: data.name, resolved: data.resolved === true };
    }
    return { name: coordLabel(lat, lng), resolved: false };
  } catch {
    // Includes AbortError, which the caller discards anyway.
    return { name: coordLabel(lat, lng), resolved: false };
  }
}

export default function LocationPicker({ lat, lng, locationName, onChange, disabled }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [placeName, setPlaceName] = useState(locationName ?? "");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [hasPin, setHasPin] = useState(lat != null && lng != null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  /**
   * Whether the map responds to touch yet.
   *
   * A Leaflet map inside a scrolling form eats one-finger drags: someone trying
   * to scroll past it instead pans the map, and the page appears to float and
   * stick. So the map starts locked and is unlocked by a deliberate tap.
   */
  const [mapActive, setMapActive] = useState(false);
  const [help, setHelp] = useState<GeoHelp | null>(null);
  const [blocked, setBlocked] = useState(false);

  // The map's click handler is registered once, so anything it reads must come
  // through a ref — otherwise it would capture the first render's props forever.
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  useEffect(() => { onChangeRef.current = onChange }, [onChange]);
  useEffect(() => { disabledRef.current = disabled }, [disabled]);

  // What we last told the parent, so echoed props don't move the map under the
  // user's finger.
  const emittedRef = useRef<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );
  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  const placeMarker = useCallback(async (position: { lat: number; lng: number }, emit: boolean) => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (markerRef.current) markerRef.current.remove();
    const icon = L.divIcon({
      html: `<div style="background:#35a26d;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: "",
    });
    markerRef.current = L.marker([position.lat, position.lng], { icon }).addTo(map);
    setHasPin(true);

    // A quick second tap should cancel the first lookup, not race it.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const { name, resolved } = await reverseGeocode(position.lat, position.lng, controller.signal);

    // The component can unmount while this is in flight — a wizard step change
    // is enough — and setting state then is a leak.
    if (!aliveRef.current || controller.signal.aborted) return;

    setPlaceName(name);
    setLookupFailed(!resolved);
    setLoading(false);
    if (emit) {
      emittedRef.current = { lat: position.lat, lng: position.lng };
      onChangeRef.current(position.lat, position.lng, name);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    if (!mapRef.current || mapInstanceRef.current) return;

    // The guard above runs before the dynamic import resolves. React 18 mounts
    // effects twice in development, so both passes clear it and start their own
    // import — and the second one initialises the same container again, throwing
    // "Map container is already initialized". Re-checked after the await below.
    let cancelled = false;

    import("leaflet").then((mod) => {
      const L = (mod as any).default ?? mod;
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        center: [lat ?? 5.6037, lng ?? -0.187],
        zoom: lat != null ? 13 : 6,
        zoomControl: true,
        attributionControl: true,
        // Locked until the member asks for it. Every one of these steals a
        // gesture the page needs: dragging eats the scroll, scrollWheelZoom
        // eats the wheel, and touchZoom eats the pinch.
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Leaflet measures the container on creation. Inside a wizard step or a
      // sheet that was hidden a moment ago it can measure zero and render a
      // grey box, so re-measure once laid out.
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 0);

      if (lat != null && lng != null) placeMarker({ lat, lng }, false);

      map.on("click", (e: any) => {
        if (disabledRef.current) return;
        placeMarker(e.latlng, true);
      });
    });

    return () => {
      cancelled = true;
      aliveRef.current = false;
      abortRef.current?.abort();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hand the gestures over only once the member has asked for the map.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const handlers = ["dragging", "scrollWheelZoom", "touchZoom", "doubleClickZoom"] as const;
    handlers.forEach((h) => (mapActive ? map[h]?.enable() : map[h]?.disable()));
  }, [mapActive]);

  // What the browser has already decided, so a blocked permission is known
  // before the button is pressed rather than after.
  useEffect(() => {
    let alive = true;
    readGeoPermission().then((state) => {
      if (alive && state === "denied") setBlocked(true);
    });
    return () => { alive = false };
  }, []);

  // Follow coordinates that changed outside the map — a profile loading in late,
  // or a form being reset. Skipped when the value is our own, echoed back.
  useEffect(() => {
    if (lat == null || lng == null || !mapInstanceRef.current) return;
    const mine = emittedRef.current;
    if (mine && Math.abs(mine.lat - lat) < 1e-9 && Math.abs(mine.lng - lng) < 1e-9) return;
    mapInstanceRef.current.setView([lat, lng], 14);
    placeMarker({ lat, lng }, false);
  }, [lat, lng, placeMarker]);

  const detectLocation = () => {
    setGeoError(null);
    setHelp(null);

    if (!navigator.geolocation) {
      setGeoError("This browser can't share your location. Set your spot on the map instead.");
      return;
    }
    if (!mapInstanceRef.current) return;

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!aliveRef.current) return;
        const { latitude, longitude } = pos.coords;
        setBlocked(false);
        mapInstanceRef.current?.setView([latitude, longitude], 16);
        placeMarker({ lat: latitude, lng: longitude }, true);
        setDetecting(false);
      },
      (err) => {
        if (!aliveRef.current) return;
        setDetecting(false);

        // Silence here is the worst outcome — the button just stops and the
        // member has no idea a permission is the reason. A denial gets the
        // steps for their actual device; everything else gets the map.
        if (err.code === err.PERMISSION_DENIED) {
          setBlocked(true);
          setHelp(geoHelpFor());
          return;
        }
        setGeoError(
          err.code === err.TIMEOUT
            ? "That took too long. Try again, or set your spot on the map."
            : "Couldn't find you. Set your spot on the map instead."
        );
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-ink">Your location</label>

      {/* The primary action. Nearly everyone should finish here without ever
          touching the map, so it gets the weight of a real button rather than
          the text link this used to be. */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={disabled || detecting}
        className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
      >
        {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        {detecting ? "Finding you…" : hasPin ? "Use my location again" : "Use my location"}
      </button>

      {/* Steps for the device in front of them. A web page cannot open system
          settings, so the honest help is precise instructions, not a button
          that would quietly do nothing. */}
      {blocked && help && (
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {help.title}
          </p>
          <ol className="mt-2 space-y-1.5">
            {help.steps.map((step, i) => (
              <li key={step} className="flex gap-2 text-sm text-amber-900/90 leading-relaxed">
                <span className="font-bold flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {help.note && <p className="text-xs text-amber-800/80 mt-2.5 leading-relaxed">{help.note}</p>}
          <p className="text-xs text-amber-800/80 mt-2.5">
            Or skip it — set your spot on the map below.
          </p>
        </div>
      )}

      {geoError && (
        <p className="text-sm text-amber-700 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {geoError}
        </p>
      )}

      {/* Confirmed spot */}
      <div className="min-h-[2.25rem] flex items-center">
        {loading ? (
          <div className="h-4 w-44 bg-gray-100 animate-pulse rounded" />
        ) : placeName ? (
          <p className="text-sm text-ink flex items-start gap-1.5">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">{placeName}</span>
              {lookupFailed && (
                <span className="block text-xs text-amber-700 mt-0.5">
                  We couldn&rsquo;t find a name for this spot — try a point nearer a road.
                </span>
              )}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            No spot set yet. Use the button above, or the map.
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-gray-200">
        <div ref={mapRef} style={{ height: 240, width: "100%" }} />

        {/*
          The lock. While it is up the map cannot receive a gesture at all, so
          scrolling the form past it behaves like scrolling past a picture.
          Leaflet's own panes sit at z-index 400+, so this has to be above them
          or it is invisible behind the tiles.
        */}
        {!mapActive && (
          <button
            type="button"
            onClick={() => !disabled && setMapActive(true)}
            disabled={disabled}
            className="absolute inset-0 z-[500] flex items-end justify-center pb-4 bg-transparent"
            aria-label="Adjust your location on the map"
          >
            <span className="bg-white/95 backdrop-blur-sm text-xs font-bold text-ink px-3.5 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-primary" />
              {hasPin ? "Tap to move the pin" : "Tap to set it on the map"}
            </span>
          </button>
        )}

        {mapActive && (
          <div className="absolute top-2 right-2 z-[500]">
            <button
              type="button"
              onClick={() => setMapActive(false)}
              className="bg-forest text-lime text-xs font-bold px-3.5 py-2 rounded-full shadow-sm"
            >
              Done
            </button>
          </div>
        )}

        {mapActive && !hasPin && (
          <div className="absolute inset-x-0 bottom-0 z-[500] flex justify-center pb-3 pointer-events-none">
            <span className="bg-white/95 backdrop-blur-sm text-xs text-gray-600 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5 text-primary" />
              Tap the map to drop your pin
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        We use this to show you what&rsquo;s nearby and to work out distances.
        Your listings show the area name, not your address — so pick a nearby
        landmark rather than your front door if you&rsquo;d rather.
      </p>
    </div>
  );
}
