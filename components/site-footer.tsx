import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-mist/50 bg-paper">
      <div className="mx-auto flex max-w-feed flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between md:px-10">
        <p className="font-display text-[1.05rem] text-slate-600">
          Everyday Ethiopian life archive.
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[0.85rem] text-slate-500">
          <Link
            href="https://t.me/povetbot"
            className="transition-colors duration-300 hover:text-ink"
            rel="noreferrer"
            target="_blank"
          >
            Submit
          </Link>
          <Link
            href="/about"
            className="transition-colors duration-300 hover:text-ink"
          >
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
