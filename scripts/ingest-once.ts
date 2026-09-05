/**
 * Run one round of inbox ingestion from your own computer (same code the Vercel cron runs).
 *
 *   npm run ingest
 */
import "dotenv/config";
import dotenv from "dotenv";
import { runEmailIngestion } from "../src/lib/imap";

dotenv.config({ path: ".env.local", override: false });

runEmailIngestion({ limit: Number(process.argv[2]) || 5 })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
