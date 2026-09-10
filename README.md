# Auteuil & Passy housing aggregator

Private two-user app that merges Paris 16e property listings (Auteuil Nord, Auteuil Sud, Muette) from
portal alert emails and one-click page captures into one filtered, de-duplicated, bilingual list + map,
with favourite/pass verdicts and a similarity-ranked "For you" feed.

Non-technical setup steps are in [SETUP.md](SETUP.md).

## How it works

```
Portal alert emails ──► Gmail inbox ──► /api/cron/ingest (every 30 min, Vercel Cron)
                                            │  IMAP (imapflow) → mailparser
Bookmarklet on any page ──► /capture/receive ──► /api/capture
                                            │
                                            ▼
                                  src/lib/extract.ts  (one Claude call per email/page,
                                                       structured output = src/lib/schema.ts,
                                                       FR→EN translation included)
                                            │
                                            ▼
                                  src/lib/ingest.ts   (dedupe by source id/url/fingerprint,
                                                       canonical property by normalised address,
                                                       geocode via BAN → lat/lng)
                                            │
                                            ▼
                                     Supabase Postgres  (supabase/migrations/0001_init.sql)
                                            │
                                            ▼
                               Next.js UI  src/app/page.tsx → src/components/Browser.tsx
                               filters · cards · Leaflet map · verdicts · notes · FR/EN toggle
                               "For you" ranking = src/lib/score.ts (weighted-feature similarity)
```

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values (see SETUP.md)
npm run dev                  # http://localhost:3000
```

Useful commands:

```bash
npm run test:extract -- samples/some-alert.eml   # run Claude extraction on a saved email, no DB writes
npm run ingest                                   # one inbox pass from your machine
npm run typecheck
```

## Deploy

Push to GitHub, import into Vercel, add the same environment variables. `vercel.json` schedules a
daily inbox check (the most Vercel's free plan allows); `.github/workflows/ingest.yml` calls the same
endpoint every 30 minutes and needs the repository secrets `APP_URL` and `CRON_SECRET`.

## Notes

- No automated scraping of SeLoger / LeBonCoin / Bien'ici (DataDome). Alerts + manual capture only.
- Photos are hot-linked from the source sites; if a site blocks that, the card shows "No photo".
- Listings never seen again are *not* auto-deactivated yet; that needs a "last seen > N days" job (Phase 2).
