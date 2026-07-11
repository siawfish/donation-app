"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon, LocateFixed } from "lucide-react";

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  locationName?: string;
  onChange: (lat: number, lng: number, locationName: string) => void;
  disabled?: boolean;
}

export default function LocationPicker({ lat, lng, locationName, onChange, disabled }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [placeName, setPlaceName] = useState(locationName ?? "");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address;
      // Build a short human-readable name: neighbourhood/suburb, city/town, country
      const parts = [
        addr.suburb || addr.neighbourhood || addr.village || addr.hamlet,
        addr.city || addr.town || addr.county,
        addr.country,
      ].filter(Boolean);
      return parts.slice(0, 2).join(", ") || data.display_name?.split(",").slice(0, 2).join(",") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const placeMarker = async (latlng: { lat: number; lng: number }, L: any) => {
    if (markerRef.current) markerRef.current.remove();
    const icon = L.divIcon({
      html: `<div style="background:#35a26d;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: "",
    });
    markerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(mapInstanceRef.current);
    setLoading(true);
    const name = await reverseGeocode(latlng.lat, latlng.lng);
    setPlaceName(name);
    onChange(latlng.lat, latlng.lng, name);
    setLoading(false);
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import leaflet (avoids SSR issues)
    import("leaflet").then((L) => {
      // Fix default icon path issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initialLat = lat ?? 5.6037;
      const initialLng = lng ?? -0.187;

      const map = L.map(mapRef.current!, {
        center: [initialLat, initialLng],
        zoom: lat ? 13 : 6,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // If initial coords, place marker
      if (lat && lng) placeMarker({ lat, lng }, L);

      // Click to place
      map.on("click", (e: any) => {
        if (disabled) return;
        placeMarker(e.latlng, L);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        import("leaflet").then((L) => {
          mapInstanceRef.current.setView([latitude, longitude], 14);
          placeMarker({ lat: latitude, lng: longitude }, L);
          setDetecting(false);
        });
      },
      () => setDetecting(false),
      { timeout: 8000 }
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

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div ref={mapRef} style={{ height: 260, width: "100%" }} />
        {!markerRef.current && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm text-xs text-gray-500 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5 text-primary" />
              Tap the map to set your location
            </div>
          </div>
        )}
      </div>

      {/* Selected location name */}
      <div className="h-8 flex items-center">
        {loading ? (
          <div className="h-3 w-40 bg-gray-100 animate-pulse rounded" />
        ) : placeName ? (
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            {placeName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
