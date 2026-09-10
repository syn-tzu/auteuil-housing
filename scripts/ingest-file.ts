/**
 * Push one saved email (.eml) or HTML file through extraction AND into the database,
 * exactly as the inbox job would. Useful for testing and for re-processing a sample.
 *
 *   npm run ingest:file -- samples/alert.eml
 *   npm run ingest:file -- samples/alert.html email
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });
import { readFileSync } from "node:fs";
import { simpleParser } from "mailparser";
import { extractListings } from "../src/lib/extract";
import { ingestExtraction } from "../src/lib/ingest";

async function main() {
  const file = process.argv[2];
  const mode = process.argv[3];
  if (!file) {
    console.error("usage: npm run ingest:file -- <file.eml|file.html> [email|url]");
    process.exit(1);
  }
  const raw = readFileSync(file);
  let extraction;
  if (file.toLowerCase().endsWith(".eml")) {
    const mail = await simpleParser(raw);
    extraction = await extractListings({
      kind: "email",
      html: typeof mail.html === "string" ? mail.html : undefined,
      text: mail.text ?? undefined,
      subject: mail.subject,
      from: mail.from?.text,
    });
  } else if (mode === "email" || !mode) {
    extraction = await extractListings({ kind: "email", html: raw.toString("utf8"), subject: file, from: "file" });
  } else {
    extraction = await extractListings({ kind: "page", html: raw.toString("utf8"), url: mode });
  }
  console.log(`${extraction.listings.length} listing(s) extracted from ${extraction.source_site}; writing to database…`);
  const summary = await ingestExtraction(extraction, { channel: mode && mode !== "email" ? "capture" : "email", url: mode });
  console.log(JSON.stringify(summary));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
