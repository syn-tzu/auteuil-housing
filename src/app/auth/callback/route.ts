import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Where Supabase sends the browser after a password-reset or magic-link email is clicked.
 * Turns the one-time code into a signed-in session, then continues to `next`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? (type === "recovery" ? "/auth/reset-password" : "/");

  const supabase = await createServerSupabase();
  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
  } else {
    error = "missing code";
  }

  const dest = url.origin + (error ? `/login?error=${encodeURIComponent(error)}` : next);
  return NextResponse.redirect(dest);
}
