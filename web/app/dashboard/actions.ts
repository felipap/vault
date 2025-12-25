"use server"

import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { clearAuthCookie, isAuthenticated } from "@/lib/admin-auth"
import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type DashboardStats = {
  totalScreenshots: number
  totalStorageBytes: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const [countResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`coalesce(sum(${Screenshots.sizeBytes}), 0)::int`,
    })
    .from(Screenshots)

  return {
    totalScreenshots: countResult.count,
    totalStorageBytes: countResult.totalBytes,
  }
}
export async function logout(): Promise<void> {
  await clearAuthCookie()
  revalidatePath("/", "layout")
  redirect("/")
}
