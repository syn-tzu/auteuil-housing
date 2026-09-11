import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { extractListings } from "@/lib/extract";
import { ingestExtraction, logIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Receives { url, html, title } from the bookmarklet's popup page (same origin, signed-in). */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: { url?: string; html?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.url || !body.html) return NextResponse.json({ error: "url and html required" }, { status: 400 });

  const externalId = `capture:${body.url}:${Date.now()}`;
  // Log immediately so a timeout still leaves a trace in the Log page.
  await logIngest({ channel: "capture", external_id: externalId, subject: body.title, status: "error", error: `started, ${Math.round(body.html.length / 1024)} KB of page received…` }).catch(() => {});
  try {
    const extraction = await extractListings({ kind: "page", html: body.html, url: body.url, subject: body.title });
    if (!extraction.is_listing_content || extraction.listings.length === 0) {
      await logIngest({ channel: "capture", external_id: externalId, subject: body.title, source_site: extraction.source_site, status: "skipped" });
      return NextResponse.json({ ok: false, reason: "no listing found on this page", source_site: extraction.source_site });
    }
    const summary = await ingestExtraction(extraction, { channel: "capture", url: body.url });
    await logIngest({
      channel: "capture",
      external_id: externalId,
      subject: body.title,
      source_site: extraction.source_site,
      status: "ok",
      listings_found: summary.found,
      listings_new: summary.created,
    });
    return NextResponse.json({ ok: true, source_site: extraction.source_site, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logIngest({ channel: "capture", external_id: externalId, subject: body.title, status: "error", error: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
