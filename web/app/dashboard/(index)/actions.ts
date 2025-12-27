"use server"

import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages, Screenshots } from "@/db/schema"
import { isAuthenticated } from "@/lib/admin-auth"
import { eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type DashboardStats = {
  totalScreenshots: number
  totalStorageBytes: number
  totalMessages: number
  totalChats: number
  totalContacts: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const [screenshotStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`coalesce(sum(${Screenshots.sizeBytes}), 0)::int`,
    })
    .from(Screenshots)

  const [messageStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(iMessages)
    .where(eq(iMessages.userId, DEFAULT_USER_ID))

  const [chatStats] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT COALESCE(chat_id, contact))::int as count
    FROM imessages
    WHERE user_id = ${DEFAULT_USER_ID}
  `)

  const [contactStats] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT contact)::int as count
    FROM imessages
    WHERE user_id = ${DEFAULT_USER_ID}
  `)

  return {
    totalScreenshots: screenshotStats.count,
    totalStorageBytes: screenshotStats.totalBytes,
    totalMessages: messageStats.count,
    totalChats: chatStats.count,
    totalContacts: contactStats.count,
  }
}
