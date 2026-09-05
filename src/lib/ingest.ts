import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import type { ExtractedListing, ExtractionResult } from "./schema";
import { geocodeAddress, jitteredCentre, type GeoPoint } from "./geocode";

export type IngestMeta = { channel: "email" | "capture"; url?: string };
export type IngestSummary = { found: number; created: number; updated: number; skipped: number };

const STREET_TYPES: Record<string, string> = {
  av: "avenue", ave: "avenue", bd: "boulevard", bld: "boulevard", boul: "boulevard",
  pl: "place", sq: "square", imp: "impasse", all: "allee", pass: "passage", ch: "chemin",
};

/** "12 Rue Poussin, Paris 16e" -> { key: "12|rue poussin|75016", number: "12", street: "rue poussin" } */
export function normalizeAddress(street: string | null, postal: string | null) {
  if (!street) return { key: null as string | null, number: null as string | null, street: null as string | null };
  let s = street.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  s = s.replace(/[.,;:()'’"-]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\b(paris|750\d\d|16e|16eme|16 eme|xvie|xvi|16th|16)\b/g, " ").replace(/\s+/g, " ").trim();
  const m = s.match(/^(\d+)\s*(bis|ter)?\s*(.*)$/);
  const number = m ? m[1] + (m[2] ?? "") : null;
  let name = m ? m[3] : s;
  name = name.replace(/^([a-z]+)\b\s*/, (w, t: string) => (STREET_TYPES[t] ?? t) + " ").trim();
  if (!name) return { key: null, number, street: null };
  const key = number ? `${number}|${name}|${postal ?? "75016"}` : null;
  return { key, number, street: name };
}

function canonicalUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    // Drop tracking params but keep the path, which usually carries the listing id.
    for (const k of Array.from(url.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|mc_|_hs|ref|source|campaign)/i.test(k)) url.searchParams.delete(k);
    }
    return url.toString();
  } catch {
    return u;
  }
}

export function dedupKey(site: string, l: ExtractedListing): string {
  if (l.source_listing_id) return `${site}:id:${l.source_listing_id.trim().toLowerCase()}`;
  if (l.source_url) return `${site}:url:${canonicalUrl(l.source_url)}`;
  const fp = createHash("sha1")
    .update([l.transaction_type, l.property_type, l.price_eur, l.surface_sqm, l.street_address?.toLowerCase(), l.pieces_count].join("|"))
    .digest("hex")
    .slice(0, 16);
  return `${site}:fp:${fp}`;
}

function pricePerSqm(l: ExtractedListing): number | null {
  if (!l.price_eur || !l.surface_sqm) return null;
  return Math.round(l.price_eur / l.surface_sqm);
}

/** Write an extraction result into Supabase, deduplicating listings and canonical properties. */
export async function ingestExtraction(result: ExtractionResult, meta: IngestMeta): Promise<IngestSummary> {
  const db = createAdminClient();
  const site = (result.source_site || "unknown").toLowerCase();
  const summary: IngestSummary = { found: result.listings.length, created: 0, updated: 0, skipped: 0 };
  const now = new Date().toISOString();

  for (const l of result.listings) {
    // Ignore fragments with nothing to show.
    if (l.price_eur == null && l.surface_sqm == null && !l.source_url) {
      summary.skipped++;
      continue;
    }
    if (l.postal_code && !/^750?16$/.test(l.postal_code) && l.quartier === "other") {
      // Outside the 16th entirely; alerts occasionally leak neighbouring areas.
      summary.skipped++;
      continue;
    }

    const key = dedupKey(site, l);
    const { data: existing } = await db
      .from("listings")
      .select("id, lat, lng, geocode_precise, canonical_property_id, photo_urls")
      .eq("dedup_key", key)
      .maybeSingle();

    // ---- canonical property (only when we have a street number) ----
    const norm = normalizeAddress(l.street_address, l.postal_code);
    let propertyId: string | null = existing?.canonical_property_id ?? null;
    let geo: GeoPoint | null = null;

    if (norm.key) {
      const { data: prop } = await db
        .from("properties")
        .select("id, lat, lng, geocode_precise")
        .eq("normalized_address", norm.key)
        .maybeSingle();
      if (prop) {
        propertyId = prop.id;
        if (prop.lat != null && prop.lng != null) geo = { lat: prop.lat, lng: prop.lng, precise: !!prop.geocode_precise };
      } else {
        geo = await geocodeAddress(l.street_address, l.postal_code ?? "75016");
        const { data: created } = await db
          .from("properties")
          .insert({
            normalized_address: norm.key,
            street_address: l.street_address,
            postal_code: l.postal_code ?? "75016",
            quartier: l.quartier,
            lat: geo?.lat ?? null,
            lng: geo?.lng ?? null,
            geocode_precise: geo?.precise ?? false,
          })
          .select("id")
          .single();
        propertyId = created?.id ?? null;
      }
    }

    // ---- coordinates for the map ----
    if (!geo && existing?.lat != null && existing?.lng != null) {
      geo = { lat: existing.lat, lng: existing.lng, precise: !!existing.geocode_precise };
    }
    if (!geo && l.street_address) geo = await geocodeAddress(l.street_address, l.postal_code ?? "75016");
    if (!geo) geo = jitteredCentre(l.quartier, key);

    const photos = Array.from(new Set([...(existing?.photo_urls ?? []), ...l.photo_urls])).slice(0, 30);

    const row = {
      source_site: site,
      source_url: l.source_url ?? meta.url ?? null,
      source_listing_id: l.source_listing_id,
      dedup_key: key,
      canonical_property_id: propertyId,
      last_seen_at: now,
      is_active: true,
      transaction_type: l.transaction_type,
      property_type: l.property_type,
      title_fr: l.title_fr,
      title_en: l.title_en,
      price_eur: l.price_eur,
      price_per_sqm_eur: pricePerSqm(l),
      monthly_charges_eur: l.monthly_charges_eur,
      agency_fees_eur: l.agency_fees_eur,
      surface_sqm: l.surface_sqm,
      land_sqm: l.land_sqm,
      pieces_count: l.pieces_count,
      bedroom_count: l.bedroom_count,
      floor: l.floor,
      total_floors: l.total_floors,
      has_elevator: l.has_elevator,
      quartier: l.quartier,
      postal_code: l.postal_code ?? "75016",
      street_address: l.street_address,
      lat: geo.lat,
      lng: geo.lng,
      geocode_precise: geo.precise,
      dpe_rating: l.dpe_rating,
      ges_rating: l.ges_rating,
      has_balcony: l.has_balcony,
      has_terrace: l.has_terrace,
      has_parking: l.has_parking,
      has_cellar: l.has_cellar,
      is_furnished: l.is_furnished,
      description_fr: l.description_fr,
      description_en: l.description_en,
      photo_urls: photos,
      agency_name: l.agency_name,
      agent_contact: l.agent_contact,
      raw_extracted_json: l,
      ingest_channel: meta.channel,
    };

    if (existing) {
      // Don't overwrite good data with nulls from a thinner source (e.g. an email teaser after a page capture).
      const patch = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined));
      const { error } = await db.from("listings").update(patch).eq("id", existing.id);
      if (error) throw new Error(`update listing failed: ${error.message}`);
      summary.updated++;
    } else {
      const { error } = await db.from("listings").insert(row);
      if (error) throw new Error(`insert listing failed: ${error.message}`);
      summary.created++;
    }
  }
  return summary;
}

/** Record what happened with one email or capture, for the audit log page. */
export async function logIngest(entry: {
  channel: "email" | "capture";
  external_id: string;
  source_site?: string | null;
  subject?: string | null;
  status: "ok" | "error" | "skipped";
  listings_found?: number;
  listings_new?: number;
  error?: string | null;
}) {
  const db = createAdminClient();
  await db.from("ingest_log").upsert(entry, { onConflict: "external_id" });
}

export async function alreadyIngested(external_id: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db.from("ingest_log").select("id").eq("external_id", external_id).eq("status", "ok").maybeSingle();
  return !!data;
}
