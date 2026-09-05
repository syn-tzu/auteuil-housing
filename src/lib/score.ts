/**
 * Preference scoring (spec §5 v2): a weighted-feature similarity score, not a trained model.
 * Every listing becomes a normalised feature vector; favourites define a "liked" centroid and
 * rejects a "disliked" centroid; each listing is scored by cosine similarity to liked minus
 * a discounted similarity to disliked. Recomputed on the fly whenever a verdict changes.
 */
import type { ListingRow } from "./types";

export type Verdict = { listing_id: string; action: "favorite" | "reject" };

export const MIN_VERDICTS_FOR_SCORING = 5;

const DPE: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };

function rawFeatures(l: ListingRow): (number | null)[] {
  const b = (v: boolean | null) => (v == null ? null : v ? 1 : 0);
  return [
    l.price_eur ? Math.log(l.price_eur) : null,
    l.price_per_sqm_eur ? Math.log(l.price_per_sqm_eur) : null,
    l.surface_sqm ?? null,
    l.bedroom_count ?? null,
    l.pieces_count ?? null,
    l.floor ?? null,
    b(l.has_elevator),
    b(l.has_balcony),
    b(l.has_terrace),
    b(l.has_parking),
    b(l.has_cellar),
    b(l.is_furnished),
    l.dpe_rating ? (DPE[l.dpe_rating.toUpperCase()] ?? null) : null,
    l.quartier === "auteuil_nord" ? 1 : 0,
    l.quartier === "auteuil_sud" ? 1 : 0,
    l.quartier === "muette" ? 1 : 0,
    l.property_type === "apartment" ? 1 : 0,
    l.property_type === "house" ? 1 : 0,
    l.property_type === "hotel_particulier" ? 1 : 0,
  ];
}

/** Returns a score in roughly [-1, 1] per listing id, or null if there aren't enough verdicts yet. */
export function scoreListings(listings: ListingRow[], verdicts: Verdict[]): Map<string, number> | null {
  const favs = new Set(verdicts.filter((v) => v.action === "favorite").map((v) => v.listing_id));
  const rejs = new Set(verdicts.filter((v) => v.action === "reject").map((v) => v.listing_id));
  if (favs.size === 0 || favs.size + rejs.size < MIN_VERDICTS_FOR_SCORING) return null;

  const raw = listings.map(rawFeatures);
  const dims = raw[0]?.length ?? 0;
  // z-score each dimension over all listings; missing values sit at the mean (0).
  const mean = new Array(dims).fill(0);
  const sd = new Array(dims).fill(0);
  for (let d = 0; d < dims; d++) {
    const vals = raw.map((r) => r[d]).filter((v): v is number => v != null);
    if (!vals.length) continue;
    mean[d] = vals.reduce((a, b) => a + b, 0) / vals.length;
    sd[d] = Math.sqrt(vals.reduce((a, b) => a + (b - mean[d]) ** 2, 0) / vals.length) || 1;
  }
  const vec = raw.map((r) => r.map((v, d) => (v == null ? 0 : (v - mean[d]) / sd[d])));
  const byId = new Map(listings.map((l, i) => [l.id, vec[i]]));

  const centroid = (ids: Set<string>) => {
    const c = new Array(dims).fill(0);
    let n = 0;
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) continue;
      n++;
      for (let d = 0; d < dims; d++) c[d] += v[d];
    }
    return n ? c.map((x) => x / n) : null;
  };
  const liked = centroid(favs);
  const disliked = centroid(rejs);
  if (!liked) return null;

  const cos = (a: number[], b: number[]) => {
    let dot = 0, na = 0, nb = 0;
    for (let d = 0; d < dims; d++) {
      dot += a[d] * b[d];
      na += a[d] ** 2;
      nb += b[d] ** 2;
    }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  };

  const out = new Map<string, number>();
  for (const l of listings) {
    const v = byId.get(l.id)!;
    let s = cos(v, liked);
    if (disliked) s -= 0.5 * cos(v, disliked);
    out.set(l.id, s);
  }
  return out;
}
