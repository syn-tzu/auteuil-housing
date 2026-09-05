/**
 * Geocode a Paris 16e street address using the French national address API
 * (Base Adresse Nationale). Free, no key. Falls back to the quartier centre.
 */
import type { Quartier } from "./schema";

export type GeoPoint = { lat: number; lng: number; precise: boolean };

// Approximate centres, used when a listing has no street address.
export const QUARTIER_CENTRE: Record<Quartier, { lat: number; lng: number }> = {
  auteuil_nord: { lat: 48.8535, lng: 2.2635 },
  auteuil_sud: { lat: 48.8445, lng: 2.2585 },
  muette: { lat: 48.8595, lng: 2.2715 },
  other: { lat: 48.8620, lng: 2.2790 },
};

const ENDPOINTS = [
  "https://data.geopf.fr/geocodage/search",
  "https://api-adresse.data.gouv.fr/search",
];

export async function geocodeAddress(street: string | null, postal = "75016"): Promise<GeoPoint | null> {
  if (!street) return null;
  const q = `${street}, Paris`;
  for (const base of ENDPOINTS) {
    try {
      const url = `${base}/?q=${encodeURIComponent(q)}&postcode=${postal}&limit=1`;
      const res = await fetch(url, { headers: { "User-Agent": "auteuil-housing/0.1" } });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        features?: { geometry: { coordinates: [number, number] }; properties: { score: number; type: string } }[];
      };
      const f = data.features?.[0];
      if (!f || f.properties.score < 0.4) continue;
      const [lng, lat] = f.geometry.coordinates;
      // "housenumber" = exact building; "street" = somewhere on the street.
      const precise = f.properties.type === "housenumber";
      return { lat, lng, precise };
    } catch {
      // try next endpoint
    }
  }
  return null;
}

/** A deterministic small offset so listings without an address don't stack on one pixel. */
export function jitteredCentre(quartier: Quartier | null, seed: string): GeoPoint {
  const c = QUARTIER_CENTRE[quartier ?? "other"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.006;
  const dy = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.004;
  return { lat: c.lat + dy, lng: c.lng + dx, precise: false };
}
