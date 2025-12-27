"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"

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

export async function getRecentChats(): Promise<Chat[]> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

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
    WHERE rm.rn = 1
    ORDER BY rm.date DESC NULLS LAST
    LIMIT 10
  `)

  return [...result].map((row) => ({
    chatId: row.chat_id,
    isGroupChat: row.chat_id.startsWith("chat"),
    lastMessageText: row.text,
    lastMessageDate: row.date,
    lastMessageFromMe: row.is_from_me === 1,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }))
}


