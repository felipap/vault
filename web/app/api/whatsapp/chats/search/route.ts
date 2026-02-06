import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone") || ""
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")

  const limit = parseInt(limitParam, 10)
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  if (isNaN(limit) || limit < 1) {
    return Response.json(
      { error: "limit must be a positive integer" },
      { status: 400 }
    )
  }

  if (isNaN(offset) || offset < 0) {
    return Response.json(
      { error: "offset must be a non-negative integer" },
      { status: 400 }
    )
  }

  // Strip non-digits from phone search
  const normalizedPhone = phone.replace(/\D/g, "")

  if (normalizedPhone.length === 0) {
    return Response.json(
      { error: "phone parameter is required and must contain digits" },
      { status: 400 }
    )
  }

  const startTime = Date.now()

  const { chats, total } = await searchChatsByPhone(
    normalizedPhone,
    limit,
    offset
  )

  await logRead({
    type: "whatsapp",
    description: `Searched WhatsApp chats by phone: ${phone}`,
    count: chats.length,
  })

  return Response.json({
    success: true,
    chats,
    count: chats.length,
    total,
    page: {
      limit,
      offset,
    },
    metadata: {
      elapsedMs: Date.now() - startTime,
      searchPhone: phone,
      normalizedPhone,
    },
  })
}

interface Chat {
  chatId: string
  chatName: string | null
  isGroupChat: boolean
  lastMessageText: string | null
  lastMessageDate: Date | null
  lastMessageFromMe: boolean
  participantCount: number
  participants: string[]
  messageCount: number
}

async function searchChatsByPhone(
  normalizedPhone: string,
  limit: number,
  offset: number
): Promise<{ chats: Chat[]; total: number }> {
  // Get total count of matching chats
  const [countResult] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT chat_id)::int as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND REGEXP_REPLACE(sender, '[^0-9]', '', 'g') LIKE '%' || ${normalizedPhone} || '%'
  `)

  const total = countResult.count

  const result = await db.execute<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: Date | null
    is_from_me: number
    participant_count: number
    participants: string[]
    message_count: number
  }>(sql`
    WITH ranked_messages AS (
      SELECT
        chat_id,
        chat_name,
        text,
        timestamp,
        is_from_me,
        sender,
        ROW_NUMBER() OVER (
          PARTITION BY chat_id
          ORDER BY timestamp DESC NULLS LAST
        ) as rn
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
    ),
    chat_participants AS (
      SELECT
        chat_id,
        COUNT(DISTINCT sender) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT sender) as participants
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY chat_id
    ),
    filtered_chats AS (
      SELECT DISTINCT chat_id
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND REGEXP_REPLACE(sender, '[^0-9]', '', 'g') LIKE '%' || ${normalizedPhone} || '%'
    )
    SELECT
      rm.chat_id,
      rm.chat_name,
      rm.text,
      rm.timestamp,
      rm.is_from_me,
      cp.participant_count,
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.chat_id = cp.chat_id
    JOIN filtered_chats fc ON rm.chat_id = fc.chat_id
    WHERE rm.rn = 1
    ORDER BY rm.timestamp DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `)

  const chats: Chat[] = [...result].map((row) => ({
    chatId: row.chat_id,
    chatName: row.chat_name,
    isGroupChat: Number(row.participant_count) > 2,
    lastMessageText: row.text,
    lastMessageDate: row.timestamp,
    lastMessageFromMe: row.is_from_me === 1,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }))

  return { chats, total }
}
