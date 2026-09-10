import { z } from "zod";

export const TransactionType = z.enum(["rent", "buy"]);
export const PropertyType = z.enum(["apartment", "house", "hotel_particulier"]);
export const Quartier = z.enum(["auteuil_nord", "auteuil_sud", "muette", "other"]);

export type TransactionType = z.infer<typeof TransactionType>;
export type PropertyType = z.infer<typeof PropertyType>;
export type Quartier = z.infer<typeof Quartier>;

/* ------------------------------------------------------------------------------------------------
 * Schema Claude fills in (structured output).
 * Claude's structured outputs allow at most 16 nullable/union fields per schema, so:
 *   - text fields use "" for "not stated"
 *   - yes/no fields use the strings "yes" | "no" | "unknown"
 *   - category fields include an explicit "unknown" option
 *   - only the numeric fields are nullable (9 of them)
 * normalizeListing() below converts this into the nullable ExtractedListing used by the rest of the app.
 * ---------------------------------------------------------------------------------------------- */

const YesNo = z.enum(["yes", "no", "unknown"]);
const text = (desc: string) => z.string().describe(`${desc} Empty string if not stated.`);

export const LlmListing = z.object({
  source_url: text("Direct link to the listing page on the source site."),
  source_listing_id: text("The site's own reference for the listing if visible (e.g. 'Réf. 12345', an ID in the URL)."),
  title_fr: text("Short French headline, e.g. 'Appartement 4 pièces 98 m² - Auteuil'."),
  title_en: text("English translation of title_fr."),
  transaction_type: z.enum(["rent", "buy", "unknown"]),
  property_type: z
    .enum(["apartment", "house", "hotel_particulier", "unknown"])
    .describe("hotel_particulier only for a genuine hôtel particulier / townhouse mansion."),
  price_eur: z.number().nullable().describe("Sale price in euros, or monthly rent in euros (charges included if stated CC). null if not stated."),
  monthly_charges_eur: z.number().nullable().describe("Rentals only: monthly charges if stated separately, else null."),
  agency_fees_eur: z.number().nullable().describe("Rentals only: agency fees / honoraires if stated, else null."),
  surface_sqm: z.number().nullable().describe("Living surface in m² (Carrez if given), else null."),
  land_sqm: z.number().nullable().describe("Land/garden surface in m², houses only, else null."),
  pieces_count: z.number().int().nullable().describe("Number of 'pièces' (rooms) as the French count them, else null."),
  bedroom_count: z.number().int().nullable().describe("Number of 'chambres', else null."),
  floor: z.number().int().nullable().describe("Floor number; French RDC (ground floor) = 0; null if not stated."),
  total_floors: z.number().int().nullable(),
  has_elevator: YesNo,
  quartier: z
    .enum(["auteuil_nord", "auteuil_sud", "muette", "other", "unknown"])
    .describe(
      "auteuil_nord / auteuil_sud if the text says Auteuil (use north/south if stated, otherwise auteuil_sud); muette if it says Muette, Passy, La Muette, Ranelagh; other if it is 75016 but a different area (Chaillot, Porte Dauphine); unknown if nothing is stated."
    ),
  postal_code: text("Postal code, e.g. 75016."),
  street_address: text("Street (and number if given) exactly as written, e.g. 'rue Poussin' or '12 rue Poussin'."),
  dpe_rating: text("Energy label letter A-G."),
  ges_rating: text("Emissions label letter A-G."),
  has_balcony: YesNo,
  has_terrace: YesNo,
  has_parking: YesNo,
  has_cellar: YesNo.describe("'cave'"),
  is_furnished: YesNo.describe("'meublé'"),
  description_fr: text("The listing description in French, cleaned of boilerplate."),
  description_en: text("Natural English translation of description_fr."),
  photo_urls: z.array(z.string()).describe("Absolute URLs of listing photos (not logos, icons or tracking pixels)."),
  agency_name: text("Agency or seller name."),
  agent_contact: text("Phone or email of the agent, if shown."),
});
export type LlmListing = z.infer<typeof LlmListing>;

export const LlmExtractionResult = z.object({
  source_site: z
    .string()
    .describe(
      "Short lowercase id of the site or agency the content came from: seloger, bienici, leboncoin, pap, logicimmo, bellesdemeures, junot, feau, barnes, sothebys, or the domain name if other."
    ),
  is_listing_content: z
    .boolean()
    .describe("false if this is not a property-listing email/page at all (newsletter, password reset, marketing)."),
  listings: z.array(LlmListing),
});
export type LlmExtractionResult = z.infer<typeof LlmExtractionResult>;

/* ---------------- internal, nullable form used by ingest.ts and the database ---------------- */

export type ExtractedListing = {
  source_url: string | null;
  source_listing_id: string | null;
  title_fr: string | null;
  title_en: string | null;
  transaction_type: TransactionType | null;
  property_type: PropertyType | null;
  price_eur: number | null;
  monthly_charges_eur: number | null;
  agency_fees_eur: number | null;
  surface_sqm: number | null;
  land_sqm: number | null;
  pieces_count: number | null;
  bedroom_count: number | null;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  quartier: Quartier | null;
  postal_code: string | null;
  street_address: string | null;
  dpe_rating: string | null;
  ges_rating: string | null;
  has_balcony: boolean | null;
  has_terrace: boolean | null;
  has_parking: boolean | null;
  has_cellar: boolean | null;
  is_furnished: boolean | null;
  description_fr: string | null;
  description_en: string | null;
  photo_urls: string[];
  agency_name: string | null;
  agent_contact: string | null;
};

export type ExtractionResult = {
  source_site: string;
  is_listing_content: boolean;
  listings: ExtractedListing[];
};

const str = (s: string): string | null => (s.trim() ? s.trim() : null);
const yn = (v: "yes" | "no" | "unknown"): boolean | null => (v === "unknown" ? null : v === "yes");
const cat = <T extends string>(v: T | "unknown"): T | null => (v === "unknown" ? null : v);

export function normalizeListing(l: LlmListing): ExtractedListing {
  return {
    source_url: str(l.source_url),
    source_listing_id: str(l.source_listing_id),
    title_fr: str(l.title_fr),
    title_en: str(l.title_en),
    transaction_type: cat(l.transaction_type),
    property_type: cat(l.property_type),
    price_eur: l.price_eur,
    monthly_charges_eur: l.monthly_charges_eur,
    agency_fees_eur: l.agency_fees_eur,
    surface_sqm: l.surface_sqm,
    land_sqm: l.land_sqm,
    pieces_count: l.pieces_count,
    bedroom_count: l.bedroom_count,
    floor: l.floor,
    total_floors: l.total_floors,
    has_elevator: yn(l.has_elevator),
    quartier: cat(l.quartier),
    postal_code: str(l.postal_code),
    street_address: str(l.street_address),
    dpe_rating: str(l.dpe_rating)?.toUpperCase() ?? null,
    ges_rating: str(l.ges_rating)?.toUpperCase() ?? null,
    has_balcony: yn(l.has_balcony),
    has_terrace: yn(l.has_terrace),
    has_parking: yn(l.has_parking),
    has_cellar: yn(l.has_cellar),
    is_furnished: yn(l.is_furnished),
    description_fr: str(l.description_fr),
    description_en: str(l.description_en),
    photo_urls: l.photo_urls.filter((u) => /^https?:\/\//i.test(u)),
    agency_name: str(l.agency_name),
    agent_contact: str(l.agent_contact),
  };
}

export function normalizeResult(r: LlmExtractionResult): ExtractionResult {
  return {
    source_site: r.source_site.trim().toLowerCase() || "unknown",
    is_listing_content: r.is_listing_content,
    listings: r.listings.map(normalizeListing),
  };
}
