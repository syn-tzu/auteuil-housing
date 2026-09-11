import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LlmExtractionResult, normalizeResult, type ExtractionResult } from "./schema";
import { htmlToText } from "./html";

const MODEL = "claude-opus-5";
const MAX_CHARS = 180_000; // ~45k tokens; alert emails are far smaller

const SYSTEM = `You extract French real-estate listings into structured JSON for a private two-person housing search in Paris 16e (Auteuil Nord, Auteuil Sud, Muette/Passy).

Rules:
- Return one entry per distinct property listing in the content. Alert emails often contain several. A listing detail page has one main listing (ignore its "similar listings" teasers). A search-results page has many listings: return every one of them, even if each has only a price, surface, rooms and a link.
- Keep numbers as plain numbers: "1 250 000 €" -> 1250000, "2 300 €/mois" -> 2300, "98,5 m²" -> 98.5.
- transaction_type: "rent" for location / à louer / loyer; "buy" for vente / à vendre / achat.
- property_type: apartment for appartement/duplex/studio/loft; house for maison/villa; hotel_particulier only when the text says hôtel particulier.
- quartier: use Auteuil / Muette / Passy / Ranelagh / Village d'Auteuil / Porte d'Auteuil cues in the text; if only "16e" or "Paris 16" is given with no quartier, use "unknown".
- description_en / title_en: translate naturally into English. Keep French place and street names untranslated.
- photo_urls: only real listing photos (URLs marked [img: ...] that look like property images). Never include logos or tracking pixels.
- Text fields: empty string when not stated. Yes/no fields: "unknown" when not stated. Numbers: null when not stated. Never guess prices or surfaces.
- If the content is not about property listings, set is_listing_content=false and return an empty listings array.`;

export type ExtractInput = {
  kind: "email" | "page";
  html?: string;
  text?: string;
  subject?: string;
  from?: string;
  url?: string;
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** Turn an email or page into the ExtractionResult schema with one Claude call. */
export async function extractListings(input: ExtractInput): Promise<ExtractionResult> {
  let body = input.text ?? "";
  if (input.html) body = htmlToText(input.html, input.url);
  if (!body.trim()) {
    return { source_site: "unknown", is_listing_content: false, listings: [] };
  }
  if (body.length > MAX_CHARS) {
    console.warn(`extractListings: content is ${body.length} chars, trimming to ${MAX_CHARS}`);
    body = body.slice(0, MAX_CHARS);
  }

  const header =
    input.kind === "email"
      ? `EMAIL\nFrom: ${input.from ?? "?"}\nSubject: ${input.subject ?? "?"}\n\n`
      : `WEB PAGE\nURL: ${input.url ?? "?"}\n\n`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium", format: zodOutputFormat(LlmExtractionResult) },
    messages: [{ role: "user", content: header + body }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude refused extraction: ${response.stop_details?.explanation ?? "no explanation"}`);
  }
  if (!response.parsed_output) {
    throw new Error(`Claude returned no parseable output (stop_reason=${response.stop_reason})`);
  }
  return normalizeResult(response.parsed_output);
}
