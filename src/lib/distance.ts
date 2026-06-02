/**
 * Haversine formula — returns distance in kilometres between two lat/lng points.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Human-readable distance string.
 * e.g. "400 m", "2.3 km", "15 km"
 */
export function formatDistance(km: number): string {
  if (km < 0.5) return `${Math.round(km * 1000)} m away`;
  if (km < 10)  return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
