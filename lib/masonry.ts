/**
 * Soft aspect-ratio normalization for archive masonry.
 *
 * Preserves natural framing for typical photographs while preventing
 * extreme portrait/landscape frames from dominating the browse rhythm.
 * Images render with object-cover inside the clamped frame — only
 * outliers are trimmed slightly at the edges.
 */

const MIN_RATIO = 0.72;
const MAX_RATIO = 1.65;

export function clampAspectRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}
