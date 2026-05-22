import { NextResponse } from "next/server";

import { getExplorePage } from "@/lib/explore";

// Pagination is deterministic — same (cursor, direction) returns the same
// slice for the duration of the revalidate window.
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const directionParam = searchParams.get("direction");
  const direction = directionParam === "before" ? "before" : "after";
  const limit = limitParam
    ? Math.min(64, Math.max(4, Number.parseInt(limitParam, 10) || 32))
    : 32;

  const page = await getExplorePage({ cursor, limit, direction });
  return NextResponse.json(page);
}
