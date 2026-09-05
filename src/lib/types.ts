import type { PropertyType, Quartier, TransactionType } from "./schema";

export type Interaction = {
  user_id: string;
  action: "favorite" | "reject" | "viewed" | "note";
  note_text: string | null;
  created_at: string;
};

/** One row of the `listing_feed` view. */
export type ListingRow = {
  id: string;
  source_site: string;
  source_url: string | null;
  source_listing_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  canonical_property_id: string | null;
  transaction_type: TransactionType | null;
  property_type: PropertyType | null;
  title_fr: string | null;
  title_en: string | null;
  price_eur: number | null;
  price_per_sqm_eur: number | null;
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
  lat: number | null;
  lng: number | null;
  geocode_precise: boolean | null;
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
  floor_plan_url: string | null;
  agency_name: string | null;
  agent_contact: string | null;
  ingest_channel: string | null;
  interactions: Interaction[];
};

export type Lang = "fr" | "en";
