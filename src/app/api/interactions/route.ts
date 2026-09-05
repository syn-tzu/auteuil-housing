import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body =
  | { listing_id: string; action: "favorite" | "reject" }
  | { listing_id: string; action: "clear" }
  | { listing_id: string; action: "note"; note_text: string };

/** Save a favourite/pass verdict (one per person per listing) or a note. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json()) as Body;
  if (!body?.listing_id) return NextResponse.json({ error: "listing_id required" }, { status: 400 });

  if (body.action === "note") {
    const text = body.note_text?.trim();
    if (!text) return NextResponse.json({ error: "empty note" }, { status: 400 });
    const { error } = await supabase
      .from("user_interactions")
      .insert({ user_id: user.id, listing_id: body.listing_id, action: "note", note_text: text });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Verdicts: remove any existing favourite/reject, then insert the new one (if any).
  const { error: delError } = await supabase
    .from("user_interactions")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", body.listing_id)
    .in("action", ["favorite", "reject"]);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  if (body.action === "favorite" || body.action === "reject") {
    const { error } = await supabase
      .from("user_interactions")
      .insert({ user_id: user.id, listing_id: body.listing_id, action: body.action });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
