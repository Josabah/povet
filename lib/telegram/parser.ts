/**
 * Caption parser.
 *
 * The pov.et channel follows a soft convention in its captions:
 *
 *   📍 <location>
 *   "<quote / commentary>"
 *   📷 by @<username>      or      📷 by Anonymous
 *
 * Any of these may be absent. The parser is tolerant of variations and
 * leaves the body text otherwise untouched (we never paraphrase a
 * contributor's words).
 *
 * Shared between the public-HTML bootstrap (`scripts/bootstrap-mock.ts`)
 * and the GramJS sync (`lib/telegram/sync.ts`).
 */

const LOCATION_PREFIX_RE = /^📍\s*([^\n]+)/;
const CONTRIBUTOR_HANDLE_RE = /📷\s*by\s*@([A-Za-z0-9_]+)/i;
const CONTRIBUTOR_ANON_RE = /📷\s*by\s*(Anonymous)/i;

export type ParsedCaption = {
  body: string | null;
  location: string | null;
  contributorUsername: string | null;
};

export function parseCaption(raw: string | null | undefined): ParsedCaption {
  if (!raw) {
    return { body: null, location: null, contributorUsername: null };
  }

  const text = raw.trim();
  if (!text) {
    return { body: null, location: null, contributorUsername: null };
  }

  let location: string | null = null;
  const locMatch = text.match(LOCATION_PREFIX_RE);
  if (locMatch) location = locMatch[1].trim();

  let contributorUsername: string | null = null;
  const handleMatch = text.match(CONTRIBUTOR_HANDLE_RE);
  const anonMatch = text.match(CONTRIBUTOR_ANON_RE);
  if (handleMatch) {
    contributorUsername = handleMatch[1];
  } else if (anonMatch) {
    contributorUsername = null;
  }

  let body = text;
  if (locMatch) body = body.replace(LOCATION_PREFIX_RE, "").trim();
  if (handleMatch) body = body.replace(CONTRIBUTOR_HANDLE_RE, "").trim();
  if (anonMatch) body = body.replace(CONTRIBUTOR_ANON_RE, "").trim();

  body = body.replace(/\n{3,}/g, "\n\n").trim();

  return {
    body: body.length ? body : null,
    location,
    contributorUsername
  };
}
