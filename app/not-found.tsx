import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-prose flex-col items-start justify-center px-6 py-24">
      <p className="text-meta uppercase tracking-widest text-slate-500">
        404
      </p>
      <h1 className="mt-4 font-display text-display-lg text-balance font-light text-ink">
        This page is quiet.
      </h1>
      <p className="mt-4 max-w-prose font-display text-[1.05rem] leading-[1.6] text-slate-600">
        Nothing here, or perhaps not here yet. Return to the archive and keep
        wandering.
      </p>
      <Link
        href="/"
        className="mt-10 text-meta uppercase tracking-widest text-ink underline underline-offset-[6px] decoration-mist hover:decoration-ink"
      >
        ← Back to the archive
      </Link>
    </div>
  );
}
