import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "pov.et is a quiet archive of everyday Ethiopian life, captured through phone photography."
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-prose px-6 pb-32 pt-12 md:pt-16">
      <h1 className="font-display text-display-xl text-balance font-light text-ink">
        Archive of everyday Ethiopian life.
      </h1>

      <div className="prose-editorial mt-10 space-y-7">
        <p>
          pov.et is a slow, deliberate archive of everyday Ethiopian life as
          captured through phone cameras. Streets and weather. Coffee scenes
          and afternoon light. The way a neighbourhood looks when nobody is
          watching. Quiet portraits with the city breathing behind them.
        </p>
        <p>
          The project began as a Telegram channel. It grew, post by post, into
          a small community of contributors who share a particular way of
          seeing the country: unhurried, observational, comfortable with
          imperfection. This site is a second home for that work, a place
          where the photographs can sit together as an archive rather than
          scroll past as a feed.
        </p>
        <p>
          We are not a competition. We are not a likes machine. We are not a
          place for heavily filtered spam. We are an archive. Every accepted
          frame becomes part of something lasting.
        </p>
        <p>
          Submissions are received through{" "}
          <Link
            href="https://t.me/povetbot"
            className="text-ink underline decoration-mist decoration-2 underline-offset-[6px] transition-colors duration-300 hover:decoration-ink"
            rel="noreferrer"
            target="_blank"
          >
            @povetbot
          </Link>
          . Moderation is manual. We value quality over quantity. One
          meaningful photograph is worth more than ten.
        </p>
        <p>
          What we&apos;re looking for: everyday moments that carry weight;
          streets, light, weather, people; coffee scenes, architecture,
          travel; portraits with atmosphere; documentary and emotional frames.
        </p>
        <p>
          What we&apos;re not: a photography contest, a social media likes
          machine, a place for heavily filtered spam.
        </p>
        <p>
          The website preserves the channel&apos;s tone. Photographs are
          shown at their own pace, with generous space around them. Captions
          are kept as their authors wrote them. Where a place is named, the
          place becomes a page of its own.
        </p>
        <p className="text-slate-500">
          Thank you to everyone who has sent a photograph in. The archive is
          yours.
        </p>
      </div>

      <div className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-mist/50 pt-10 text-[0.9rem] text-slate-500">
        <Link
          href="https://t.me/pov_et"
          className="transition-colors duration-300 hover:text-ink"
          rel="noreferrer"
          target="_blank"
        >
          Telegram
        </Link>
        <Link
          href="https://t.me/povetbot"
          className="transition-colors duration-300 hover:text-ink"
          rel="noreferrer"
          target="_blank"
        >
          @povetbot
        </Link>
        <Link
          href="https://instagram.com/pov_et1"
          className="transition-colors duration-300 hover:text-ink"
          rel="noreferrer"
          target="_blank"
        >
          Instagram
        </Link>
      </div>
    </article>
  );
}
