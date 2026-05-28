import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Submit",
  description: "Submissions arrive through @povetbot on Telegram."
};

export default function SubmitPage() {
  return (
    <article className="mx-auto max-w-prose px-6 pb-32 pt-12 md:pt-16">
      <h1 className="font-display text-display-xl text-balance font-light text-ink">
        Send a photograph.
      </h1>

      <div className="prose-editorial mt-10 space-y-6">
        <p>
          Submissions arrive through Telegram. Open the bot, send one photo or
          a group of up to ten, and add a caption with the place if you know
          it. We&apos;ll take a look and write back.
        </p>
        <ul className="ml-5 list-disc space-y-2 text-slate-600">
          <li>Everyday moments: streets, weather, light, people, architecture, café scenes.</li>
          <li>Phone photos are encouraged. Imperfection is part of the texture.</li>
          <li>One meaningful photo is worth more than ten.</li>
          <li>Tell us the place. Locations become pages of their own.</li>
        </ul>
      </div>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="https://t.me/povetbot"
          className="inline-flex items-center justify-center rounded-sm border border-ink bg-ink px-6 py-3 text-[0.88rem] text-paper transition-colors duration-300 hover:bg-slate-700"
          rel="noreferrer"
          target="_blank"
        >
          Open @povetbot
        </Link>
        <Link
          href="https://t.me/pov_et"
          className="inline-flex items-center justify-center rounded-sm border border-mist px-6 py-3 text-[0.88rem] text-slate-500 transition-colors duration-300 hover:border-ink hover:text-ink"
          rel="noreferrer"
          target="_blank"
        >
          Browse the channel
        </Link>
      </div>
    </article>
  );
}
