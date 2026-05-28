/** Render mood/hashtag names as `#tag` labels for display. */
export function formatHashtagLabels(moods: ReadonlyArray<string>): string {
  return moods.map((m) => `#${m.replace(/^#/, "")}`).join(" ");
}
