import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { runEmailIngestion } from "@/lib/imap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** "Check inbox" button: same job as the scheduled run, triggered by a signed-in user. */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  try {
    const result = await runEmailIngestion({ limit: 5 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
