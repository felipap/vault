"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Message = {
  id: string
  text: string | null
  contact: string
  date: Date | null
  isFromMe: boolean
  hasAttachments: boolean
  service: string
}

export type MessagesPage = {
  messages: Message[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getMessages(
  page: number = 1,
  pageSize: number = 20
): Promise<MessagesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(iMessages)
    .where(eq(iMessages.userId, DEFAULT_USER_ID))

  const total = countResult.count

  const messages = await db.query.iMessages.findMany({
    where: eq(iMessages.userId, DEFAULT_USER_ID),
    orderBy: desc(iMessages.date),
    limit: pageSize,
    offset,
    columns: {
      id: true,
      text: true,
      contact: true,
      date: true,
      isFromMe: true,
      hasAttachments: true,
      service: true,
    },
  })

  return {
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      contact: m.contact,
      date: m.date,
      isFromMe: m.isFromMe === 1,
      hasAttachments: m.hasAttachments === 1,
      service: m.service,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}


