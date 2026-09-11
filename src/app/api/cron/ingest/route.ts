import { NextResponse } from "next/server";
import { runEmailIngestion } from "@/lib/imap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Called by Vercel Cron every 30 minutes (vercel.json), or manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/ingest
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runEmailIngestion({ limit: 5 });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ingest failed", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
