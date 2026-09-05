import { z } from "zod";

export const TransactionType = z.enum(["rent", "buy"]);
export const PropertyType = z.enum(["apartment", "house", "hotel_particulier"]);
export const Quartier = z.enum(["auteuil_nord", "auteuil_sud", "muette", "other"]);

export type TransactionType = z.infer<typeof TransactionType>;
export type PropertyType = z.infer<typeof PropertyType>;
export type Quartier = z.infer<typeof Quartier>;

/** One listing as Claude extracts it from an alert email or a captured page. */
export const ExtractedListing = z.object({
  source_url: z
    .string()
    .nullable()
    .describe("Direct link to the listing page on the source site, if present."),
  source_listing_id: z
    .string()
    .nullable()
    .describe("The site's own reference for the listing if visible (e.g. 'Réf. 12345', an ID in the URL)."),
  title_fr: z.string().nullable().describe("Short French headline, e.g. 'Appartement 4 pièces 98 m² - Auteuil'."),
  title_en: z.string().nullable().describe("English translation of title_fr."),
  transaction_type: TransactionType.nullable(),
  property_type: PropertyType.nullable().describe("hotel_particulier only for a genuine hôtel particulier / townhouse mansion."),
  price_eur: z.number().nullable().describe("Sale price in euros, or monthly rent in euros (charges included if stated CC)."),
  monthly_charges_eur: z.number().nullable().describe("Rentals only: monthly charges if stated separately."),
  agency_fees_eur: z.number().nullable().describe("Rentals only: agency fees / honoraires if stated."),
  surface_sqm: z.number().nullable().describe("Living surface in m² (Carrez if given)."),
  land_sqm: z.number().nullable().describe("Land/garden surface in m², houses only."),
  pieces_count: z.number().int().nullable().describe("Number of 'pièces' (rooms) as the French count them."),
  bedroom_count: z.number().int().nullable().describe("Number of 'chambres'."),
  floor: z.number().int().nullable().describe("Floor number; French RDC (ground floor) = 0."),
  total_floors: z.number().int().nullable(),
  has_elevator: z.boolean().nullable(),
  quartier: Quartier.nullable().describe(
    "auteuil_nord / auteuil_sud if the text says Auteuil (use north/south if stated, otherwise auteuil_sud); muette if it says Muette, Passy, La Muette, Ranelagh; other if it is 75016 but a different area (Chaillot, Porte Dauphine) or unknown."
  ),
  postal_code: z.string().nullable(),
  street_address: z.string().nullable().describe("Street (and number if given) exactly as written, e.g. 'rue Poussin' or '12 rue Poussin'."),
  dpe_rating: z.string().nullable().describe("Energy label letter A-G."),
  ges_rating: z.string().nullable().describe("Emissions label letter A-G."),
  has_balcony: z.boolean().nullable(),
  has_terrace: z.boolean().nullable(),
  has_parking: z.boolean().nullable(),
  has_cellar: z.boolean().nullable().describe("'cave'"),
  is_furnished: z.boolean().nullable().describe("'meublé'"),
  description_fr: z.string().nullable().describe("The listing description in French, cleaned of boilerplate."),
  description_en: z.string().nullable().describe("Natural English translation of description_fr."),
  photo_urls: z.array(z.string()).describe("Absolute URLs of listing photos (not logos, icons or tracking pixels)."),
  agency_name: z.string().nullable(),
  agent_contact: z.string().nullable().describe("Phone or email of the agent, if shown."),
});
export type ExtractedListing = z.infer<typeof ExtractedListing>;

export const ExtractionResult = z.object({
  source_site: z
    .string()
    .describe(
      "Short lowercase id of the site or agency the content came from: seloger, bienici, leboncoin, pap, logicimmo, bellesdemeures, junot, feau, barnes, sothebys, or the domain name if other."
    ),
  is_listing_content: z
    .boolean()
    .describe("false if this is not a property-listing email/page at all (newsletter, password reset, marketing)."),
  listings: z.array(ExtractedListing),
});
export type ExtractionResult = z.infer<typeof ExtractionResult>;
