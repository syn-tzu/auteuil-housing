import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { extractListings } from "./extract";
import { ingestExtraction, logIngest, alreadyIngested, type IngestSummary } from "./ingest";
import { isAlertSender } from "./senders";

export type EmailRunResult = {
  unread: number; // unread emails in the inbox
  matched: number; // of which from property sites
  processed: number;
  errors: number;
  remaining: number; // matched but left for the next run
  details: { subject: string; from: string; status: string; summary?: IngestSummary; error?: string }[];
};

type Parsed = {
  uid: number;
  messageId: string;
  subject: string;
  from: string;
  html?: string;
  text?: string;
};

/**
 * Read unseen emails from property sites in the alert inbox, extract listings with Claude,
 * store them, and mark each successfully processed email as read. Personal mail in the same
 * inbox is never opened or marked. Processes `limit` emails per run (in parallel) so a single
 * run stays within the serverless time limit.
 */
export async function runEmailIngestion(opts: { limit?: number } = {}): Promise<EmailRunResult> {
  const limit = opts.limit ?? 5;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not set");

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const result: EmailRunResult = { unread: 0, matched: 0, processed: 0, errors: 0, remaining: 0, details: [] };
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = await client.search({ seen: false }, { uid: true });
    const list = Array.isArray(uids) ? uids : [];
    result.unread = list.length;
    if (!list.length) return result;

    // Cheap pass: headers only, decide which emails are ours.
    const candidates: { uid: number; from: string; subject: string }[] = [];
    for await (const msg of client.fetch(list, { envelope: true }, { uid: true })) {
      const from = msg.envelope?.from?.map((a) => a.address ?? "").join(",") ?? "";
      const subject = msg.envelope?.subject ?? "(no subject)";
      if (isAlertSender(from, subject)) candidates.push({ uid: msg.uid, from, subject });
    }
    result.matched = candidates.length;
    const batch = candidates.slice(0, limit);
    result.remaining = candidates.length - batch.length;

    const parsed: Parsed[] = [];
    for (const c of batch) {
      const msg = await client.fetchOne(String(c.uid), { source: true }, { uid: true });
      if (!msg || !msg.source) {
        result.details.push({ subject: c.subject, from: c.from, status: "error", error: "could not download email" });
        result.errors++;
        continue;
      }
      const mail = await simpleParser(msg.source);
      parsed.push({
        uid: c.uid,
        messageId: mail.messageId ?? `uid-${c.uid}-${user}`,
        subject: mail.subject ?? c.subject,
        from: mail.from?.text ?? c.from,
        html: typeof mail.html === "string" ? mail.html : undefined,
        text: mail.text ?? undefined,
      });
    }

    const outcomes = await Promise.all(parsed.map((p) => processOne(p)));
    const doneUids: number[] = [];
    for (const o of outcomes) {
      result.details.push(o.detail);
      if (o.ok) {
        result.processed++;
        doneUids.push(o.uid);
      } else {
        result.errors++;
      }
    }
    if (doneUids.length) {
      await client.messageFlagsAdd(doneUids, ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return result;
}

async function processOne(p: Parsed): Promise<{ ok: boolean; uid: number; detail: EmailRunResult["details"][number] }> {
  const base = { subject: p.subject, from: p.from };
  try {
    if (await alreadyIngested(p.messageId)) {
      return { ok: true, uid: p.uid, detail: { ...base, status: "already done" } };
    }
    const extraction = await extractListings({ kind: "email", html: p.html, text: p.text, subject: p.subject, from: p.from });
    if (!extraction.is_listing_content) {
      await logIngest({ channel: "email", external_id: p.messageId, subject: p.subject, source_site: extraction.source_site, status: "skipped" });
      return { ok: true, uid: p.uid, detail: { ...base, status: "not a listing email" } };
    }
    const summary = await ingestExtraction(extraction, { channel: "email" });
    await logIngest({
      channel: "email",
      external_id: p.messageId,
      subject: p.subject,
      source_site: extraction.source_site,
      status: "ok",
      listings_found: summary.found,
      listings_new: summary.created,
    });
    return { ok: true, uid: p.uid, detail: { ...base, status: "ok", summary } };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logIngest({ channel: "email", external_id: p.messageId, subject: p.subject, status: "error", error }).catch(() => {});
    return { ok: false, uid: p.uid, detail: { ...base, status: "error", error } };
  }
}
