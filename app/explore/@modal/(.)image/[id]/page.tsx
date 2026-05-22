import { notFound } from "next/navigation";

import { ExploreImageView } from "@/components/explore/explore-image-view";
import { getExploreImageById } from "@/lib/explore";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExploreImageModalPage({ params }: Props) {
  const { id } = await params;
  const image = await getExploreImageById(id);
  if (!image) notFound();

  return <ExploreImageView id={id} modal />;
}
