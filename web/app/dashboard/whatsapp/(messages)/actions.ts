"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID, WhatsappMessages } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type SortBy = "syncTime" | "timestamp"

export type WhatsappMessage = {
  id: string
  messageId: string
  chatId: string
  text: string | null
  sender: string
  senderName: string | null
  timestamp: Date
  syncTime: Date
  isFromMe: boolean
}

export type WhatsappMessagesPage = {
  messages: WhatsappMessage[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type WhatsappMessageDetail = WhatsappMessage & {
  deviceId: string
  createdAt: Date
}

export async function getWhatsappMessages(
  page: number = 1,
  pageSize: number = 20,
  sortBy: SortBy = "timestamp"
): Promise<WhatsappMessagesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(WhatsappMessages)
    .where(eq(WhatsappMessages.userId, DEFAULT_USER_ID))

  const total = countResult.count

  const orderByColumn =
    sortBy === "syncTime" ? WhatsappMessages.syncTime : WhatsappMessages.timestamp

  const messages = await db.query.WhatsappMessages.findMany({
    where: eq(WhatsappMessages.userId, DEFAULT_USER_ID),
    orderBy: desc(orderByColumn),
    limit: pageSize,
    offset,
    columns: {
      id: true,
      messageId: true,
      chatId: true,
      text: true,
      sender: true,
      senderName: true,
      timestamp: true,
      syncTime: true,
      isFromMe: true,
    },
  })

  return {
    messages: messages.map((m) => ({
      id: m.id,
      messageId: m.messageId,
      chatId: m.chatId,
      text: m.text,
      sender: m.sender,
      senderName: m.senderName,
      timestamp: m.timestamp,
      syncTime: m.syncTime,
      isFromMe: m.isFromMe === 1,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getWhatsappMessage(id: string): Promise<WhatsappMessageDetail | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const message = await db.query.WhatsappMessages.findFirst({
    where: eq(WhatsappMessages.id, id),
  })

  if (!message) {
    return null
  }

  return {
    id: message.id,
    messageId: message.messageId,
    chatId: message.chatId,
    text: message.text,
    sender: message.sender,
    senderName: message.senderName,
    timestamp: message.timestamp,
    syncTime: message.syncTime,
    isFromMe: message.isFromMe === 1,
    deviceId: message.deviceId,
    createdAt: message.createdAt,
  }
}

export async function deleteAllWhatsappMessages(): Promise<{ deletedMessages: number }> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const [result] = await db
    .delete(WhatsappMessages)
    .where(eq(WhatsappMessages.userId, DEFAULT_USER_ID))
    .returning({ id: WhatsappMessages.id })
    .then((rows) => [{ count: rows.length }])

  return {
    deletedMessages: result.count,
  }
}
