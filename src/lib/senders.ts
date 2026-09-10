/**
 * Which emails the ingestion job is allowed to read. The alert inbox is also a personal
 * mailbox, so only mail from the property portals/agencies is touched; everything else is
 * left unread and unseen by the app.
 *
 * Add more senders with the ALERT_SENDERS env var (comma-separated, matched against the
 * From address, case-insensitive), e.g. ALERT_SENDERS=bonjour@some-agency.fr,other.com
 */
export const ALERT_SENDER_PATTERNS: string[] = [
  "seloger",
  "bienici",
  "bien-ici",
  "leboncoin",
  "pap.fr",
  "logic-immo",
  "logicimmo",
  "bellesdemeures",
  "belles-demeures",
  "junot",
  "feau",
  "barnes",
  "sothebysrealty",
  "sotheby",
  "meilleursagents",
  "figaroimmo",
  "immobilier",
  "notaires",
  ...(process.env.ALERT_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
];

const SUBJECT_HINTS = /\b(annonce|annonces|alerte immo|nouveaux biens|nouveau bien|nouvelles annonces|appartement|maison|h[oô]tel particulier)\b/i;

/** True if the From address matches a known property sender (or, failing that, the subject is clearly a listing alert). */
export function isAlertSender(from: string, subject = ""): boolean {
  const f = from.toLowerCase();
  if (ALERT_SENDER_PATTERNS.some((p) => f.includes(p))) return true;
  // Subject-only fallback for agencies we haven't listed yet; still requires a French listing word.
  return /\.(fr|com|immo)$/i.test(f.split("@")[1] ?? "") && SUBJECT_HINTS.test(subject) && /immo|agence|realty|properties|conseil/i.test(f);
}
