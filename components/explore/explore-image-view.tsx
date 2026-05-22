import { ExploreModalShell } from "./explore-modal-shell";
import { ExploreReader } from "./explore-reader";
import {
  getExploreImageById,
  getExploreNeighbors,
  getExplorePage
} from "@/lib/explore";

type Props = {
  id: string;
  /** When true, render as intercepting overlay; otherwise full-page reader. */
  modal?: boolean;
};

/**
 * Server seeds the reader with:
 *   - the current image (full meta for the hero)
 *   - its prev/next neighbours (so the first ‹ / › click is instant)
 *   - the wall slice that *continues from* the current image — the
 *     first tile is the image immediately after `id`, so the grid
 *     below the hero is specific to whatever was opened.
 */
export async function ExploreImageView({ id, modal = false }: Props) {
  const current = await getExploreImageById(id);
  if (!current) return null;

  const [neighbours, wall] = await Promise.all([
    getExploreNeighbors(id),
    getExplorePage({ cursor: id, limit: 32, direction: "after" })
  ]);

  const reader = (
    <ExploreReader
      initialImage={current}
      initialPrevious={neighbours.previous}
      initialNext={neighbours.next}
      initialWall={wall.images}
      initialWallCursor={wall.nextCursor}
      mode={modal ? "modal" : "page"}
    />
  );

  if (modal) {
    return <ExploreModalShell>{reader}</ExploreModalShell>;
  }

  return <div className="fixed inset-0 z-[90] bg-paper">{reader}</div>;
}
