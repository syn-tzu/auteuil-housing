/**
 * Try the Claude extraction on a saved email (.eml) or web page (.html) without touching the database.
 *
 *   npm run test:extract -- samples/seloger-alert.eml
 *   npm run test:extract -- samples/junot-listing.html https://www.junot.fr/...
 *
 * To save an alert email from Gmail: open it -> ⋮ menu -> "Download message" -> put the .eml in samples/.
 */
import "dotenv/config";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { simpleParser } from "mailparser";
import { extractListings } from "../src/lib/extract";

dotenv.config({ path: ".env.local", override: false });

async function main() {
  const file = process.argv[2];
  const url = process.argv[3];
  if (!file) {
    console.error("usage: npm run test:extract -- <file.eml|file.html> [url]");
    process.exit(1);
  }
  const raw = readFileSync(file);
  const started = Date.now();
  let result;
  if (file.toLowerCase().endsWith(".eml")) {
    const mail = await simpleParser(raw);
    result = await extractListings({
      kind: "email",
      html: typeof mail.html === "string" ? mail.html : undefined,
      text: mail.text ?? undefined,
      subject: mail.subject,
      from: mail.from?.text,
    });
  } else {
    result = await extractListings({ kind: "page", html: raw.toString("utf8"), url });
  }
  console.log(JSON.stringify(result, null, 2));
  console.error(`\n${result.listings.length} listing(s) from ${result.source_site} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
