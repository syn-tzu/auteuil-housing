import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** What the ingestion job did recently: which emails/pages were read and what came out of them. */
export default async function LogPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("ingest_log")
    .select("created_at, channel, source_site, subject, status, listings_found, listings_new, error")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="page">
      <p><a href="/">← Back</a></p>
      <h1>Ingestion log</h1>
      <p>The inbox is checked every 30 minutes. Each alert email or captured page appears here once it has been read.</p>
      {!data?.length ? (
        <p className="empty">Nothing yet.</p>
      ) : (
        <table className="log">
          <thead>
            <tr><th>When</th><th>Via</th><th>Source</th><th>Subject</th><th>Result</th></tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.created_at).toLocaleString("en-GB")}</td>
                <td>{r.channel}</td>
                <td>{r.source_site ?? "—"}</td>
                <td>{r.subject ?? "—"}</td>
                <td>
                  {r.status === "ok" && `${r.listings_found} found, ${r.listings_new} new`}
                  {r.status === "skipped" && "not a listing"}
                  {r.status === "error" && <span className="error">{r.error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
