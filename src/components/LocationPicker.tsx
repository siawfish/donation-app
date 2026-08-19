"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinIcon, LocateFixed, AlertCircle } from "lucide-react";
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
    if (!navigator.geolocation) {
      setGeoError("This browser can't share your location.");
      return;
    }
    if (!mapInstanceRef.current) return;

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!aliveRef.current) return;
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current?.setView([latitude, longitude], 14);
        placeMarker({ lat: latitude, lng: longitude }, true);
        setDetecting(false);
      },
      (err) => {
        if (!aliveRef.current) return;
        setDetecting(false);
        // Silence here is the worst outcome — the button just stops and the
        // member has no idea a browser permission is the reason.
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is blocked. Tap the map instead."
            : "Couldn't get your location. Tap the map instead."
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Your Location</label>
        <button
          type="button"
          onClick={detectLocation}
          disabled={disabled || detecting}
          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline disabled:opacity-50"
        >
          <LocateFixed className="w-3.5 h-3.5" />
          {detecting ? "Detecting…" : "Use my location"}
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapRef} style={{ height: 260, width: "100%" }} />

        {/* Leaflet's own panes sit at z-index 400+, so an un-layered overlay is
            invisible behind the tiles — which is why this hint never showed. */}
        {!hasPin && (
          <div className="absolute inset-0 z-[500] flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm text-xs text-gray-600 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5 text-primary" />
              Tap the map to set your location
            </div>
          </div>
        )}
      </div>

      <div className="min-h-8 flex items-center">
        {loading ? (
          <div className="h-3 w-40 bg-gray-100 animate-pulse rounded" />
        ) : placeName ? (
          <p className="text-sm text-gray-600 flex items-start gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {placeName}
              {lookupFailed && (
                <span className="block text-xs text-amber-700 mt-0.5">
                  We couldn&rsquo;t find a name for this spot — try a point nearer a road.
                </span>
              )}
            </span>
          </p>
        ) : null}
      </div>

      {geoError && (
        <p className="text-xs text-amber-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {geoError}
        </p>
      )}
    </div>
  );
}
