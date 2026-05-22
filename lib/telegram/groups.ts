/**
 * Media-group normalization.
 *
 * One logical pov.et post may arrive as N separate Telegram messages
 * sharing the same `groupedId`. The Telegram API returns each message
 * independently; this module collapses them back into the editorial
 * unit they represent.
 *
 * This is the single most important correctness piece in the sync
 * pipeline. Get the grouping wrong and the archive corrupts (captions
 * detach, images split, ordering scrambles). Unit-tested in
 * `tests/telegram-groups.test.ts`.
 *
 * Inputs are intentionally typed as a minimal interface so the function
 * can be tested without depending on the full GramJS shape.
 */

export type RawTelegramMessage = {
  id: number;
  /** Telegram's media-group identifier. `null`/`undefined` for standalones. */
  groupedId?: string | null;
  /** Unix timestamp (seconds). */
  date: number;
  /** Caption text. May be empty on grouped messages other than the lead. */
  message?: string | null;
  /** Whether this message carries an attached photo. */
  hasPhoto: boolean;
  views?: number | null;
  reactions?: Array<{ emoji: string; count: number }> | null;
};

export type LogicalPost = {
  /** The lowest message id in the group — this becomes our canonical post id. */
  anchorId: number;
  /** The original Telegram groupedId, preserved for audit. `null` for standalones. */
  groupedId: string | null;
  /** Merged caption. The first non-empty caption in id order wins. */
  caption: string | null;
  /** Earliest publish date in the group, ISO string. */
  publishedAt: string;
  /** Highest view count observed across the group. */
  views: number;
  /** Reactions from whichever message in the group had them. */
  reactions: Array<{ emoji: string; count: number }>;
  /** Messages contributing photos, ordered by id ascending. */
  photoMessages: RawTelegramMessage[];
};

/**
 * Collapse a list of Telegram messages into logical posts.
 *
 * Behavior:
 *   • Messages sharing a `groupedId` are merged into a single LogicalPost.
 *   • Messages without a `groupedId` are treated as standalone posts.
 *   • Messages without photos are dropped (a text-only message produces no
 *     archive entry — pov.et is a photography archive).
 *   • Within a group, photo messages are sorted by id ascending so the
 *     viewing order matches the contributor's submission order.
 *   • The first non-empty caption (by id) wins.
 *   • `publishedAt` is the earliest date in the group.
 *   • A group with no photo messages is dropped entirely.
 *
 * Input order does not matter; output is sorted by `anchorId` ascending.
 */
export function groupMessages(
  messages: ReadonlyArray<RawTelegramMessage>
): LogicalPost[] {
  // Bucket by groupedId; standalones get their own bucket keyed by id.
  const buckets = new Map<string, RawTelegramMessage[]>();
  for (const m of messages) {
    const key = m.groupedId ? `g:${m.groupedId}` : `s:${m.id}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(m);
  }

  const out: LogicalPost[] = [];

  for (const [key, raw] of buckets) {
    const sorted = [...raw].sort((a, b) => a.id - b.id);
    const photoMessages = sorted.filter((m) => m.hasPhoto);
    if (photoMessages.length === 0) continue;

    const anchorId = sorted[0].id;
    const groupedId = key.startsWith("g:") ? key.slice(2) : null;

    const caption =
      sorted.find(
        (m) => m.message && m.message.trim().length > 0
      )?.message?.trim() ?? null;

    const publishedAt = new Date(
      Math.min(...sorted.map((m) => m.date)) * 1000
    ).toISOString();

    const views = sorted.reduce(
      (acc, m) => Math.max(acc, m.views ?? 0),
      0
    );

    const reactions =
      sorted.find((m) => m.reactions && m.reactions.length > 0)?.reactions ??
      [];

    out.push({
      anchorId,
      groupedId,
      caption,
      publishedAt,
      views,
      reactions,
      photoMessages
    });
  }

  out.sort((a, b) => a.anchorId - b.anchorId);
  return out;
}
