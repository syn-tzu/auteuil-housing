/**
 * Convert email/page HTML into compact text that keeps links and image URLs.
 * Cheap and dependency-free; the LLM does the real parsing.
 */
export function htmlToText(html: string, baseUrl?: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, "");
  // images -> [img: url]
  s = s.replace(/<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi, (_m, src: string) => {
    const u = absolutize(src, baseUrl);
    return isLikelyPhoto(u) ? ` [img: ${u}] ` : " ";
  });
  // links -> text (url)
  s = s.replace(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const text = stripTags(inner).trim();
    const u = absolutize(href, baseUrl);
    if (!u || /^(mailto:|tel:|javascript:|#)/i.test(u)) return text ? ` ${text} ` : " ";
    return text ? ` ${text} (${u}) ` : ` (${u}) `;
  });
  s = s.replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/table)\b[^>]*>/gi, "\n");
  s = stripTags(s);
  s = decodeEntities(s);
  s = s
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return s;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function absolutize(u: string, base?: string): string {
  try {
    return new URL(u, base).toString();
  } catch {
    return u;
  }
}

function isLikelyPhoto(u: string): boolean {
  if (!/^https?:/i.test(u)) return false;
  if (/(pixel|track|beacon|logo|icon|spacer|1x1|badge|sprite|\.gif(\?|$))/i.test(u)) return false;
  return true;
}

function decodeEntities(s: string): string {
  const map: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç",
    ocirc: "ô", ucirc: "û", ugrave: "ù", icirc: "î", iuml: "ï", euro: "€", deg: "°", sup2: "²",
  };
  return s
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name: string) => map[name.toLowerCase()] ?? m);
}
