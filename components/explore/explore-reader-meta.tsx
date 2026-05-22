import Link from "next/link";

import {
  formatContributor,
  formatPhotographerHandle
} from "@/lib/format";
import type { ExploreImage } from "@/lib/types";

type Props = {
  image: ExploreImage;
};

/**
 * Mobile one-liner beneath the photograph (hidden on `md+`, where
 * [`ExploreReaderMetaSide`] takes over). Photographer on the left,
 * location · +N more close behind — items hug their natural width
 * with a generous gap rather than being pushed to opposite edges.
 */
export function ExploreReaderMeta({ image }: Props) {
  const handle = formatPhotographerHandle(
    image.contributorUsername,
    image.contributorDisplayName
  );
  const extra = Math.max(0, image.stackSize - 1);
  const hasLocation = Boolean(image.location && image.locationSlug);

  const handleNode = image.contributorUsername ? (
    <Link
      href={`/photographer/${image.contributorUsername}`}
      className="truncate text-ink transition-colors duration-300 hover:text-slate-600"
    >
      {handle}
    </Link>
  ) : (
    <span className="truncate text-ink/80">
      {formatContributor(
        image.contributorUsername,
        image.contributorDisplayName
      )}
    </span>
  );

  return (
    <div className="flex min-w-0 items-baseline gap-x-5 text-[0.84rem] text-slate-500">
      <span className="min-w-0 shrink truncate">{handleNode}</span>

      {(hasLocation || extra > 0) && (
        <span className="inline-flex min-w-0 shrink items-baseline gap-2">
          {hasLocation ? (
            <Link
              href={`/location/${image.locationSlug}`}
              className="truncate text-slate-700 transition-colors duration-300 hover:text-ink"
            >
              {image.location}
            </Link>
          ) : null}
          {hasLocation && extra > 0 ? (
            <span aria-hidden className="shrink-0 text-slate-400">
              ·
            </span>
          ) : null}
          {extra > 0 ? (
            <Link
              href={`/post/${image.postSlug}`}
              className="shrink-0 text-slate-600 transition-colors duration-300 hover:text-ink"
              aria-label={`View full stack of ${image.stackSize} photographs`}
            >
              +{extra} more
            </Link>
          ) : null}
        </span>
      )}
    </div>
  );
}
