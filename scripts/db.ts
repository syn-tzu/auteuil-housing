/**
 * Quick look at what's in the database, or delete test rows.
 *
 *   npm run db                       # list active listings
 *   npm run db -- log                # last 30 ingest_log rows
 *   npm run db -- delete-site seloger  # delete all listings from one source (asks no questions!)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const db = createAdminClient();
  const cmd = process.argv[2] ?? "list";
  if (cmd === "list") {
    const { data, error } = await db
      .from("listings")
      .select("id, source_site, dedup_key, transaction_type, property_type, price_eur, surface_sqm, quartier, street_address, lat, lng, geocode_precise, canonical_property_id, first_seen_at, last_seen_at")
      .eq("is_active", true)
      .order("first_seen_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    console.table(
      data.map((r) => ({
        site: r.source_site,
        key: r.dedup_key.slice(0, 40),
        tx: r.transaction_type,
        type: r.property_type,
        price: r.price_eur,
        m2: r.surface_sqm,
        quartier: r.quartier,
        street: r.street_address,
        lat: r.lat?.toFixed(4),
        lng: r.lng?.toFixed(4),
        precise: r.geocode_precise,
        prop: r.canonical_property_id?.slice(0, 8) ?? "",
        seen: r.last_seen_at.slice(0, 16),
      }))
    );
    console.log(`${data.length} active listing(s)`);
  } else if (cmd === "show") {
    // npm run db -- show [maxPrice]   full detail of active listings (optionally only those priced <= maxPrice)
    const max = Number(process.argv[3]);
    let q = db.from("listings").select("title_fr,transaction_type,price_eur,monthly_charges_eur,surface_sqm,pieces_count,bedroom_count,floor,quartier,street_address,source_url,agency_name,description_fr").eq("is_active", true);
    if (max) q = q.lte("price_eur", max);
    const { data, error } = await q.order("price_eur");
    if (error) throw error;
    for (const r of data ?? []) console.log(JSON.stringify({ ...r, description_fr: (r.description_fr ?? "").slice(0, 300) }, null, 1));
  } else if (cmd === "log") {
    const { data, error } = await db.from("ingest_log").select("created_at, channel, source_site, subject, status, listings_found, listings_new, error").order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    console.table(data);
  } else if (cmd === "delete-title") {
    // npm run db -- delete-title colocation   delete listings whose French title contains the text
    const text = process.argv[3];
    if (!text) throw new Error("usage: npm run db -- delete-title <text>");
    const { count, error } = await db.from("listings").delete({ count: "exact" }).ilike("title_fr", `%${text}%`);
    if (error) throw error;
    console.log(`deleted ${count} listing(s) with "${text}" in the title`);
  } else if (cmd === "delete-site") {
    const site = process.argv[3];
    if (!site) throw new Error("usage: npm run db -- delete-site <source_site>");
    const { count, error } = await db.from("listings").delete({ count: "exact" }).eq("source_site", site);
    if (error) throw error;
    console.log(`deleted ${count} listing(s) from ${site}`);
  } else {
    throw new Error(`unknown command ${cmd}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
