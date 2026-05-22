import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-feed items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          aria-label="pov.et"
          className="font-display text-[1.35rem] font-medium tracking-tight text-ink"
        >
          pov.et
        </Link>

        <nav className="flex items-center gap-7 text-[0.85rem] text-slate-500">
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
        </nav>
      </div>
    </header>
  );
}
