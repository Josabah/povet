import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-mist/40 bg-paper">
      <div className="mx-auto flex max-w-feed items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          aria-label="pov.et"
          className="font-display text-[1.35rem] font-medium tracking-tight text-ink"
        >
          pov.et
        </Link>

        <nav className="flex items-center text-[0.85rem] text-slate-500">
          <Link
            href="/explore"
            className="transition-colors duration-300 hover:text-ink"
          >
            Explore
          </Link>
          <div className="ml-10 flex items-center gap-5">
            <Link
              href="/about"
              className="transition-colors duration-300 hover:text-ink"
            >
              About
            </Link>
            <Link
              href="/submit"
              className="transition-colors duration-300 hover:text-ink"
            >
              Submit
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
