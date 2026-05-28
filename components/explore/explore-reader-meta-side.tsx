import Link from "next/link";

import { MetaLocationIcon, MetaPersonIcon } from "@/components/icons/meta-icons";
import {
  formatContributor,
  formatMonthYear,
  formatPhotographerHandle
} from "@/lib/format";
import { formatHashtagLabels } from "@/lib/mood-labels";
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
  const hashtagLine = formatHashtagLabels(image.moods);
  const hasContext =
    Boolean(hashtagLine) ||
    Boolean(image.location && image.locationSlug) ||
    hasQuote;

  return (
    <div className="explore-meta-side font-sans text-[0.86rem] leading-relaxed">
      <header className="explore-meta-side__identity">
        <div className="explore-meta-side__row">
          <MetaPersonIcon className="explore-meta-side__icon" />
          <div className="min-w-0">
            {image.contributorUsername ? (
              <Link
                href={`/photographer/${image.contributorUsername}`}
                className="text-soot transition-colors duration-300 hover:text-slate-700"
              >
                {handle}
              </Link>
            ) : (
              <span className="text-soot">
                {formatContributor(
                  image.contributorUsername,
                  image.contributorDisplayName
                )}
              </span>
            )}

            {date ? (
              <p className="explore-meta-side__date text-[0.78rem] text-slate-500">
                {date}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {hasContext ? (
        <div className="explore-meta-side__context">
          {image.location && image.locationSlug ? (
            <p className="explore-meta-side__row font-display italic text-soot">
              <MetaLocationIcon className="explore-meta-side__icon" />
              <Link
                href={`/location/${image.locationSlug}`}
                className="min-w-0 text-soot transition-colors duration-300 hover:text-slate-700"
              >
                {image.location}
              </Link>
            </p>
          ) : null}

          {hashtagLine ? (
            <p
              className={`text-[0.82rem] text-slate-500 ${
                image.location && image.locationSlug
                  ? "explore-meta-side__item-gap"
                  : ""
              }`}
            >
              {hashtagLine}
            </p>
          ) : null}

          {hasQuote ? (
            <blockquote
              className={`explore-meta-side__quote font-display italic leading-relaxed text-soot ${
                hashtagLine || image.location
                  ? "explore-meta-side__quote-offset"
                  : ""
              }`}
            >
              &ldquo;{image.caption}&rdquo;
            </blockquote>
          ) : null}
        </div>
      ) : null}

      {extra > 0 ? (
        <nav
          className="explore-meta-side__stack-link"
          aria-label="Archive links"
        >
          <Link
            href={`/post/${image.postSlug}`}
            aria-label={`View full stack of ${image.stackSize} photographs`}
          >
            +{extra} more →
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
