import { NextResponse } from "next/server";

import { getExploreNeighbors } from "@/lib/explore";

// Returns full ExploreImage data (so swap can render meta immediately).
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ previous: null, next: null });
  }
  const result = await getExploreNeighbors(id);
  return NextResponse.json(result);
}
