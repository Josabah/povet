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

export function formatContributor(
  username: string | null,
  displayName: string | null
): string {
  if (displayName && displayName.trim().length > 0) return displayName;
  if (username && username.trim().length > 0) return username;
  return "Anonymous";
}
