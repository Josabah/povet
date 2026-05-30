/**
 * Quiet date/contributor formatting helpers.
 *
 * The brief asks us not to translate or paraphrase captions. We do however
 * format dates and counts ourselves for editorial consistency.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

export function formatPublishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** Quiet month-year for explore detail (e.g. "May 2026"). */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Treat the first line / clause of a caption as a "stack title". Keeps
 * the sidebar quiet — long captions live on the full post page.
 */
export function captionAsStackTitle(
  caption: string | null,
  maxChars = 64
): string | null {
  if (!caption) return null;
  const firstLine = caption.split(/\r?\n/)[0]?.trim();
  if (!firstLine) return null;
  if (firstLine.length <= maxChars) return firstLine;
  const cut = firstLine.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function formatContributor(
  username: string | null,
  displayName: string | null
): string {
  if (displayName && displayName.trim().length > 0) return displayName;
  if (username && username.trim().length > 0) return username;
  return "Anonymous";
}

/** Feed/footer handle: @username, display name, or Anonymous. */
export function formatPhotographerHandle(
  username: string | null,
  displayName: string | null
): string {
  if (username && username.trim().length > 0) return `@${username}`;
  if (displayName && displayName.trim().length > 0) return displayName;
  return "Anonymous";
}

/** Short label for post-to-post navigation (location, then contributor). */
export function formatPostNavLabel(
  location: string | null,
  contributorUsername: string | null,
  contributorDisplayName: string | null
): string {
  if (location?.trim()) return location.trim();
  return formatContributor(contributorUsername, contributorDisplayName);
}

/**
 * Alt text for hero/lightbox frames. Captions are kept verbatim when present.
 */
export function formatPhotoAlt(options: {
  caption?: string | null;
  location?: string | null;
  contributorUsername?: string | null;
  contributorDisplayName?: string | null;
  index?: number;
  total?: number;
}): string {
  const {
    caption,
    location,
    contributorUsername,
    contributorDisplayName,
    index,
    total
  } = options;
  const trimmed = caption?.trim();
  if (trimmed) {
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
  }

  const contributor = formatContributor(
    contributorUsername ?? null,
    contributorDisplayName ?? null
  );
  const base = location?.trim()
    ? `Photograph from ${location.trim()}`
    : "Photograph from the archive";
  const credit =
    contributor !== "Anonymous" ? `${base}, by ${contributor}` : base;

  if (
    index !== undefined &&
    total !== undefined &&
    total > 1 &&
    Number.isFinite(index)
  ) {
    return `${credit} (${index + 1} of ${total})`;
  }
  return credit;
}
