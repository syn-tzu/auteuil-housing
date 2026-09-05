-- Auteuil/Passy housing aggregator: initial schema.
-- Run this once in the Supabase SQL editor (see SETUP.md, step 2).

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type transaction_type as enum ('rent', 'buy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum ('apartment', 'house', 'hotel_particulier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quartier_type as enum ('auteuil_nord', 'auteuil_sud', 'muette', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interaction_action as enum ('favorite', 'reject', 'viewed', 'note');
exception when duplicate_object then null; end $$;

-- ---------- canonical properties (one row per physical address) ----------
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  normalized_address text unique not null,   -- "12|rue poussin|75016"
  street_address text,
  postal_code text,
  quartier quartier_type,
  lat double precision,
  lng double precision,
  geocode_precise boolean default false,
  created_at timestamptz not null default now()
);

-- ---------- listings (one row per property per source) ----------
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  source_site text not null,
  source_url text,
  source_listing_id text,
  dedup_key text not null unique,            -- see src/lib/ingest.ts
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  canonical_property_id uuid references properties(id) on delete set null,

  transaction_type transaction_type,
  property_type property_type,
  title_fr text,
  title_en text,

  price_eur numeric,
  price_per_sqm_eur numeric,
  monthly_charges_eur numeric,
  agency_fees_eur numeric,

  surface_sqm numeric,
  land_sqm numeric,
  pieces_count int,
  bedroom_count int,
  floor int,
  total_floors int,
  has_elevator boolean,

  quartier quartier_type,
  postal_code text,
  street_address text,
  lat double precision,
  lng double precision,
  geocode_precise boolean default false,

  dpe_rating text,
  ges_rating text,

  has_balcony boolean,
  has_terrace boolean,
  has_parking boolean,
  has_cellar boolean,
  is_furnished boolean,

  description_fr text,
  description_en text,
  photo_urls text[] not null default '{}',
  floor_plan_url text,

  agency_name text,
  agent_contact text,

  raw_extracted_json jsonb,
  ingest_channel text,                        -- 'email' | 'capture' | 'scrape'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_active_idx on listings (is_active, last_seen_at desc);
create index if not exists listings_property_idx on listings (canonical_property_id);
create index if not exists listings_tx_quartier_idx on listings (transaction_type, quartier);

-- ---------- what each of us did with a listing ----------
create table if not exists user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  action interaction_action not null,
  note_text text,
  created_at timestamptz not null default now()
);

-- One verdict (favorite OR reject) per person per listing. Notes/views can repeat.
create unique index if not exists user_verdict_unique
  on user_interactions (user_id, listing_id)
  where action in ('favorite', 'reject');

create index if not exists user_interactions_listing_idx on user_interactions (listing_id);

-- ---------- ingestion audit log ----------
create table if not exists ingest_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                      -- 'email' | 'capture'
  external_id text unique,                    -- Gmail Message-ID, or capture URL + timestamp
  source_site text,
  subject text,
  status text not null,                       -- 'ok' | 'error' | 'skipped'
  listings_found int default 0,
  listings_new int default 0,
  error text,
  created_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists listings_set_updated_at on listings;
create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- ---------- row level security ----------
-- Listings/properties: any signed-in user can read; only the server (service role) writes.
alter table properties enable row level security;
alter table listings enable row level security;
alter table user_interactions enable row level security;
alter table ingest_log enable row level security;

drop policy if exists "read properties" on properties;
create policy "read properties" on properties for select to authenticated using (true);

drop policy if exists "read listings" on listings;
create policy "read listings" on listings for select to authenticated using (true);

drop policy if exists "read ingest_log" on ingest_log;
create policy "read ingest_log" on ingest_log for select to authenticated using (true);

-- Interactions: both of us can see each other's favorites/notes, but only edit our own.
drop policy if exists "read interactions" on user_interactions;
create policy "read interactions" on user_interactions for select to authenticated using (true);

drop policy if exists "insert own interactions" on user_interactions;
create policy "insert own interactions" on user_interactions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own interactions" on user_interactions;
create policy "update own interactions" on user_interactions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own interactions" on user_interactions;
create policy "delete own interactions" on user_interactions for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- a view that joins listings with both users' verdicts ----------
create or replace view listing_feed as
select
  l.*,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
        'user_id', ui.user_id, 'action', ui.action, 'note_text', ui.note_text, 'created_at', ui.created_at))
     from user_interactions ui where ui.listing_id = l.id),
    '[]'::jsonb
  ) as interactions
from listings l;

grant select on listing_feed to authenticated;
