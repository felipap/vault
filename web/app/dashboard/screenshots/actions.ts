"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Screenshot = {
  id: string
  width: number
  height: number
  sizeBytes: number
  capturedAt: Date
}

export type ScreenshotsPage = {
  screenshots: Screenshot[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getScreenshots(
  page: number = 1,
  pageSize: number = 20
): Promise<ScreenshotsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(Screenshots)

  const total = countResult.count

  const screenshots = await db.query.Screenshots.findMany({
    orderBy: desc(Screenshots.capturedAt),
    limit: pageSize,
    offset,
    columns: {
      id: true,
      width: true,
      height: true,
      sizeBytes: true,
      capturedAt: true,
    },
  })

  return {
    screenshots,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getScreenshotData(id: string): Promise<string | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const screenshot = await db.query.Screenshots.findFirst({
    where: eq(Screenshots.id, id),
    columns: { data: true },
  })

  return screenshot?.data ?? null
}


