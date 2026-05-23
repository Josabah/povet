import type { Metadata } from "next";

import { ExploreGrid } from "@/components/explore/explore-grid";
import { getExplorePage } from "@/lib/explore";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Explore",
  description:
    "A flowing wall of Ethiopian life — every photograph, one quiet canvas.",
  alternates: { canonical: "/explore" }
};

const EXPLORE_SSR_SIZE = 64;

export default async function ExplorePage() {
  const { images, nextCursor } = await getExplorePage({
    limit: EXPLORE_SSR_SIZE
  });

  return (
    <div className="mx-auto w-full max-w-[1800px] px-3 pt-4 sm:px-4 md:px-5 md:pt-6">
      <ExploreGrid initialImages={images} initialCursor={nextCursor} />
    </div>
  );
}
