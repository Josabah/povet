import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExploreImageView } from "@/components/explore/explore-image-view";
import { getExploreImageById } from "@/lib/explore";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const image = await getExploreImageById(id);
  if (!image) return {};
  return {
    title: "Photograph",
    openGraph: { images: [{ url: image.media.src }] }
  };
}

export default async function ExploreImagePage({ params }: Props) {
  const { id } = await params;
  const image = await getExploreImageById(id);
  if (!image) notFound();

  return <ExploreImageView id={id} />;
}
