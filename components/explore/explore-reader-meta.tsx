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
 * [`ExploreReaderMetaSide`] takes over). Handle left, location
 * centered, +N more right — width matches the image via
 * `.explore-hero__media`.
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
      className="truncate text-ink transition-colors duration-300 hover:text-ink/80"
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
    <div className="explore-hero__meta-row grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-2 text-[0.84rem] text-slate-500">
      <div className="min-w-0 truncate text-left">{handleNode}</div>

      <div className="min-w-0 truncate text-center">
        {hasLocation ? (
          <Link
            href={`/location/${image.locationSlug}`}
            className="truncate text-slate-700 transition-colors duration-300 hover:text-ink"
          >
            {image.location}
          </Link>
        ) : null}
      </div>

      <div className="min-w-0 truncate text-right">
        {extra > 0 ? (
          <Link
            href={`/post/${image.postSlug}`}
            className="truncate text-slate-600 transition-colors duration-300 hover:text-ink"
            aria-label={`View full stack of ${image.stackSize} photographs`}
          >
            +{extra} more
          </Link>
        ) : null}
      </div>
    </div>
  );
}
