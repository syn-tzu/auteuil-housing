import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingRow } from "@/lib/types";
import Browser from "@/components/Browser";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("listing_feed")
    .select("*")
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  // Names for the two accounts so "who favourited this" can say Stuart / Diana.
  const names: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 50 });
    for (const u of users?.users ?? []) {
      const label = (u.user_metadata?.name as string | undefined) || u.email?.split("@")[0] || "user";
      names[u.id] = label.charAt(0).toUpperCase() + label.slice(1);
    }
  } catch {
    // Service key missing locally: fall back to "you" / "partner".
  }

  return <Browser listings={(data ?? []) as ListingRow[]} userId={user!.id} names={names} />;
}
