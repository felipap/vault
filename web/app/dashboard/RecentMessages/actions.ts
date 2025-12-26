"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { iMessages } from "@/db/schema"
import { desc, count } from "drizzle-orm"

export type Message = {
  id: string
  text: string | null
  contact: string
  date: Date | null
  isFromMe: boolean
  hasAttachments: boolean
  service: string
}

export type PaginatedMessages = {
  messages: Message[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const PAGE_SIZE = 10

export async function getRecentMessages(
  page: number = 1
): Promise<PaginatedMessages> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const offset = (page - 1) * PAGE_SIZE

  const [messages, totalResult] = await Promise.all([
    db.query.iMessages.findMany({
      orderBy: desc(iMessages.date),
      limit: PAGE_SIZE,
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
    }),
    db.select({ count: count() }).from(iMessages),
  ])

  const total = totalResult[0]?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

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
    pageSize: PAGE_SIZE,
    totalPages,
  }
}
