/**
 * Save recent emails from the property sites as .eml files in samples/, read or unread,
 * so the extraction can be tested without touching the database.
 *
 *   npm run samples            # last 30 days, all known senders
 *   npm run samples -- seloger # only senders matching this text
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });
import { mkdirSync, writeFileSync } from "node:fs";
import { ImapFlow } from "imapflow";
import { ALERT_SENDER_PATTERNS, isAlertSender } from "../src/lib/senders";

async function main() {
  const filter = process.argv[2]?.toLowerCase();
  const user = process.env.GMAIL_USER!;
  const pass = process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "");
  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  mkdirSync("samples", { recursive: true });
  let saved = 0;
  try {
    const since = new Date(Date.now() - 30 * 86400e3);
    const uids = await client.search({ since }, { uid: true });
    const list = Array.isArray(uids) ? uids : [];
    console.log(`${list.length} emails in the last 30 days; scanning senders (${ALERT_SENDER_PATTERNS.length} known patterns)…`);
    // Pass 1: headers only. (Downloading inside this loop deadlocks the IMAP connection.)
    const wanted: { uid: number; from: string; subject: string; date: Date }[] = [];
    for await (const msg of client.fetch(list, { envelope: true }, { uid: true })) {
      const from = msg.envelope?.from?.map((a) => a.address ?? "").join(",") ?? "";
      const subject = msg.envelope?.subject ?? "";
      if (!isAlertSender(from, subject)) continue;
      if (filter && !from.toLowerCase().includes(filter) && !subject.toLowerCase().includes(filter)) continue;
      wanted.push({ uid: msg.uid, from, subject, date: msg.envelope?.date ?? new Date() });
    }
    console.log(`${wanted.length} from property sites.`);
    // Pass 2: download those.
    for (const w of wanted) {
      const full = await client.fetchOne(String(w.uid), { source: true }, { uid: true });
      if (!full || !full.source) continue;
      const site = (w.from.split("@")[1] ?? "unknown").replace(/[^a-z0-9.]/gi, "");
      const file = `samples/${w.date.toISOString().slice(0, 10)}-${site}-${w.uid}.eml`;
      writeFileSync(file, full.source);
      saved++;
      console.log(`saved ${file}  |  ${w.from}  |  ${w.subject}`);
    }
  } finally {
    lock.release();
    await client.logout();
  }
  console.log(`${saved} sample(s) saved.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
