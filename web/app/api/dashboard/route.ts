import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { screenshots } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [countResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`coalesce(sum(${screenshots.sizeBytes}), 0)::int`,
    })
    .from(screenshots)
    .where(eq(screenshots.userId, session.user.id));

  const recentScreenshots = await db.query.screenshots.findMany({
    where: eq(screenshots.userId, session.user.id),
    orderBy: desc(screenshots.capturedAt),
    limit: 10,
    columns: {
      id: true,
      width: true,
      height: true,
      sizeBytes: true,
      capturedAt: true,
    },
  });

  return NextResponse.json({
    totalScreenshots: countResult.count,
    totalStorageBytes: countResult.totalBytes,
    recentScreenshots,
  });
}

