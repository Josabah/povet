/**
 * Caption parser.
 *
 * Current pov.et channel convention (2026):
 *
 *   #tag #tag …
 *   <location as plain text>
 *   "<quote / commentary>"
 *   📷 by @<username>      or      📷 by Anonymous
 *   @pov_et
 *
 * Legacy posts may still use 📍 for location or store a plain caption
 * without quotes. Any field may be absent.
 *
 * Shared between the public-HTML bootstrap (`scripts/bootstrap-mock.ts`),
 * the GramJS sync (`lib/telegram/sync.ts`), and `scripts/reparse-captions.ts`.
 */

const LOCATION_PIN_RE = /^📍\s*([^\n]+)/m;
const CONTRIBUTOR_HANDLE_RE = /📷\s*by\s*@([A-Za-z0-9_]+)/i;
const CONTRIBUTOR_ANON_RE = /📷\s*by\s*(Anonymous)/i;
const HASHTAG_RE = /#([A-Za-z0-9_]+)/g;
const QUOTED_CAPTION_RE = /[""]([^""\n]+)[""]|"([^"\n]+)"/;
const SIGNATURE_LINE_RE = /(?:^|\n)\s*@pov_?et\s*(?=\n|$)/gi;
const TRAILING_SIGNATURE_RE = /\s*@pov_?et\s*$/gi;
const HANDLE_ONLY_LINE_RE = /^@[A-Za-z0-9_]+$/;

export type ParsedCaption = {
  /** Quote text only — no hashtags, location, author, or signature. */
  caption: string | null;
  location: string | null;
  contributorUsername: string | null;
  /** Lowercase tag names without the leading #. */
  hashtags: string[];
  /** @deprecated Use `caption`. Kept for callers not yet updated. */
  body: string | null;
};

export function parseCaption(raw: string | null | undefined): ParsedCaption {
  const empty: ParsedCaption = {
    caption: null,
    body: null,
    location: null,
    contributorUsername: null,
    hashtags: []
  };

  if (!raw) return empty;

  let text = raw.trim();
  if (!text) return empty;

  let contributorUsername: string | null = null;
  const handleMatch = text.match(CONTRIBUTOR_HANDLE_RE);
  const anonMatch = text.match(CONTRIBUTOR_ANON_RE);
  if (handleMatch) {
    contributorUsername = handleMatch[1];
    text = text.replace(CONTRIBUTOR_HANDLE_RE, " ").trim();
  } else if (anonMatch) {
    contributorUsername = null;
    text = text.replace(CONTRIBUTOR_ANON_RE, " ").trim();
  }

  text = text.replace(SIGNATURE_LINE_RE, "\n").replace(TRAILING_SIGNATURE_RE, "").trim();

  let caption: string | null = null;
  const quoteMatch = text.match(QUOTED_CAPTION_RE);
  if (quoteMatch) {
    caption = (quoteMatch[1] ?? quoteMatch[2] ?? "").trim();
    text = text.replace(quoteMatch[0], " ").trim();
  }

  const hashtags: string[] = [];
  const seenTags = new Set<string>();
  text = text
    .replace(HASHTAG_RE, (_, tag: string) => {
      const normalized = tag.toLowerCase();
      if (!seenTags.has(normalized)) {
        seenTags.add(normalized);
        hashtags.push(normalized);
      }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  let location: string | null = null;
  const pinMatch = text.match(LOCATION_PIN_RE);
  if (pinMatch) {
    location = pinMatch[1].trim();
    text = text.replace(LOCATION_PIN_RE, " ").trim();
  }

  const hadStructure = hashtags.length > 0 || Boolean(pinMatch) || Boolean(quoteMatch);

  if (!location && hadStructure) {
    location = extractPlainLocation(text);
    if (location) {
      text = text.replace(location, " ").replace(/\s+/g, " ").trim();
    }
  }

  if (!caption && text) {
    caption = text;
  }

  caption = caption?.length ? caption : null;
  location = location?.length ? location : null;

  return {
    caption,
    body: caption,
    location,
    contributorUsername,
    hashtags
  };
}

function extractPlainLocation(text: string): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const lines = cleaned
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !HANDLE_ONLY_LINE_RE.test(line));

  const candidate = lines[0] ?? cleaned;
  if (!candidate || !looksLikeLocation(candidate)) return null;
  return candidate;
}

function looksLikeLocation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[.!?]/.test(t)) return false;
  if (t.length > 80) return false;
  return true;
}
