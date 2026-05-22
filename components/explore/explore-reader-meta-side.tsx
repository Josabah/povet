import Link from "next/link";

import {
  formatContributor,
  formatMonthYear,
  formatPhotographerHandle
} from "@/lib/format";
import type { ExploreImage } from "@/lib/types";

type Props = {
  image: ExploreImage;
};

/**
 * Desktop sidebar meta — a quiet column beside the photograph. Shows
 * the contributor handle, date, location, the post's caption styled as
 * a pull-quote (line-clamped so long captions don't blow the column
 * out), and links into the rest of the archive (stack, contributor).
 *
 * The mobile one-liner [`ExploreReaderMeta`] lives separately; both
 * are rendered with mutually exclusive responsive visibility classes
 * from [`ExploreReaderHero`].
 */
export function ExploreReaderMetaSide({ image }: Props) {
  const handle = formatPhotographerHandle(
    image.contributorUsername,
    image.contributorDisplayName
  );
  const extra = Math.max(0, image.stackSize - 1);
  const date = formatMonthYear(image.publishedAt);
  const hasQuote = Boolean(image.caption && image.caption.trim().length > 0);

  return (
    <div className="flex flex-col gap-7 font-sans text-[0.86rem] leading-relaxed">
      <div className="flex flex-col gap-1.5">
        {image.contributorUsername ? (
          <Link
            href={`/photographer/${image.contributorUsername}`}
            className="text-ink transition-colors duration-300 hover:text-slate-600"
          >
            {handle}
          </Link>
        ) : (
          <span className="text-ink/80">
            {formatContributor(
              image.contributorUsername,
              image.contributorDisplayName
            )}
          </span>
        )}

        {date ? (
          <p className="text-[0.78rem] text-slate-600">{date}</p>
        ) : null}

        {image.location && image.locationSlug ? (
          <p className="text-[0.82rem]">
            <Link
              href={`/location/${image.locationSlug}`}
              className="text-slate-700 transition-colors duration-300 hover:text-ink"
            >
              {image.location}
            </Link>
          </p>
        ) : null}
      </div>

      {hasQuote ? (
        <blockquote className="explore-meta-side__quote font-display text-[0.98rem] italic leading-snug text-slate-700">
          {image.caption}
        </blockquote>
      ) : null}

      {extra > 0 ? (
        <nav
          className="flex flex-col gap-2 text-[0.82rem] text-slate-600"
          aria-label="Archive links"
        >
          <Link
            href={`/post/${image.postSlug}`}
            className="transition-colors duration-300 hover:text-ink"
            aria-label={`View full stack of ${image.stackSize} photographs`}
          >
            +{extra} more →
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
