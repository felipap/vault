"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Chat = {
  chatId: string
  isGroupChat: boolean
  lastMessageText: string | null
  lastMessageDate: Date | null
  lastMessageFromMe: boolean
  participantCount: number
  participants: string[]
  messageCount: number
}

export type ChatsPage = {
  chats: Chat[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getChats(
  page: number = 1,
  pageSize: number = 20,
  search: string = ""
): Promise<ChatsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize
  const normalizedSearch = search.replace(/\D/g, "")
  const hasSearch = normalizedSearch.length > 0

  const [countResult] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT COALESCE(chat_id, contact))::int as count
    FROM imessages
    WHERE user_id = ${DEFAULT_USER_ID}
      ${hasSearch ? sql`AND REGEXP_REPLACE(contact, '[^0-9]', '', 'g') LIKE '%' || ${normalizedSearch} || '%'` : sql``}
  `)

  const total = countResult.count

  const result = await db.execute<{
    chat_id: string
    text: string | null
    date: Date | null
    is_from_me: number
    participant_count: number
    participants: string[]
    message_count: number
  }>(sql`
    WITH ranked_messages AS (
      SELECT
        COALESCE(chat_id, contact) as effective_chat_id,
        id,
        text,
        date,
        is_from_me,
        contact,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(chat_id, contact)
          ORDER BY date DESC NULLS LAST
        ) as rn
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND text IS NOT NULL
    ),
    chat_participants AS (
      SELECT
        COALESCE(chat_id, contact) as effective_chat_id,
        COUNT(DISTINCT contact) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT contact) as participants
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY COALESCE(chat_id, contact)
    ),
    filtered_chats AS (
      SELECT DISTINCT COALESCE(chat_id, contact) as effective_chat_id
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        ${hasSearch ? sql`AND REGEXP_REPLACE(contact, '[^0-9]', '', 'g') LIKE '%' || ${normalizedSearch} || '%'` : sql``}
    )
    SELECT
      rm.effective_chat_id as chat_id,
      rm.text,
      rm.date,
      rm.is_from_me,
      cp.participant_count,
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.effective_chat_id = cp.effective_chat_id
    ${hasSearch ? sql`JOIN filtered_chats fc ON rm.effective_chat_id = fc.effective_chat_id` : sql``}
    WHERE rm.rn = 1
    ORDER BY rm.date DESC NULLS LAST
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)

  return {
    chats: [...result].map((row) => ({
      chatId: row.chat_id,
      isGroupChat: row.chat_id.startsWith("chat"),
      lastMessageText: row.text,
      lastMessageDate: row.date,
      lastMessageFromMe: row.is_from_me === 1,
      participantCount: Number(row.participant_count),
      participants: row.participants,
      messageCount: Number(row.message_count),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export type ContactLookup = Record<string, string>

export async function getContactLookup(): Promise<ContactLookup> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const contacts = await db.query.Contacts.findMany({
    where: eq(Contacts.userId, DEFAULT_USER_ID),
  })

  const lookup: ContactLookup = {}

  for (const contact of contacts) {
    const name = [contact.firstName, contact.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()

    if (!name) {
      continue
    }

    let emails: string[] = []
    let phoneNumbers: string[] = []

    try {
      emails = JSON.parse(contact.emails)
    } catch {}

    try {
      phoneNumbers = JSON.parse(contact.phoneNumbers)
    } catch {}

    // Map emails to contact name
    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()
      if (normalizedEmail) {
        lookup[normalizedEmail] = name
      }
    }

    // Map phone numbers to contact name (normalized)
    for (const phone of phoneNumbers) {
      const normalizedPhone = normalizePhone(phone)
      if (normalizedPhone) {
        lookup[normalizedPhone] = name
      }
    }
  }

  return lookup
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}
