/**
 * Checks every account/key in .env.local actually works. Prints one line per check.
 *
 *   npm run check
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const report = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return report("Supabase keys", false, "one of the three Supabase values is empty");

  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { error: tErr } = await admin.from("listings").select("id", { count: "exact", head: true });
  if (tErr) return report("Supabase tables", false, `${tErr.message} — has the SQL file been run? (SETUP.md step 1.4)`);
  report("Supabase tables", true, "listings table exists");

  const { data: users, error: uErr } = await admin.auth.admin.listUsers({ perPage: 20 });
  if (uErr) return report("Supabase logins", false, `${uErr.message} — is the secret key correct?`);
  const emails = users.users.map((u) => u.email).filter(Boolean);
  report("Supabase logins", emails.length >= 1, emails.length ? `${emails.length} user(s): ${emails.join(", ")}` : "no users yet (SETUP.md step 1.5)");

  const pub = createClient(url, anon, { auth: { persistSession: false } });
  const { error: pErr } = await pub.from("listings").select("id", { head: true });
  report("Supabase publishable key", !pErr, pErr ? pErr.message : "accepted");
}

async function checkAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return report("Anthropic key", false, "ANTHROPIC_API_KEY is empty");
  try {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 200,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with the single word OK." }],
    });
    const text = r.content.find((b) => b.type === "text")?.text ?? "";
    report("Anthropic key", true, `model answered "${text.trim()}"`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report("Anthropic key", false, /credit|billing/i.test(msg) ? `${msg} — add credit at console.anthropic.com` : msg);
  }
}

async function checkGmail() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return report("Gmail inbox", false, "GMAIL_USER or GMAIL_APP_PASSWORD is empty");
  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false });
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true, unseen: true });
      report("Gmail inbox", true, `connected as ${user}: ${status.messages} emails, ${status.unseen} unread`);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report("Gmail inbox", false, /AUTHENTICATIONFAILED|Invalid credentials/i.test(msg) ? `${msg} — check the app password (SETUP.md step 3)` : msg);
  }
}

async function main() {
  await Promise.all([checkSupabase(), checkAnthropic(), checkGmail()]);
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}: ${r.detail}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
main();
