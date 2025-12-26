import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Messages } from "@/db/schema"

function validateAuth(request: NextRequest): boolean {
  const expected = process.env.DEVICE_SECRET
  if (!expected) {
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice(7)
  return token === expected
}

type MessagePayload = {
  id: string
  text: string
  sender: string
  isFromMe: boolean
  date: string
  chatId: string
  isGroup: boolean
}

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const messages = body.messages as MessagePayload[]

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    )
  }

  const inserted = await db
    .insert(Messages)
    .values(
      messages.map((msg) => ({
        externalId: msg.id,
        text: msg.text,
        sender: msg.sender,
        isFromMe: msg.isFromMe,
        chatId: msg.chatId,
        isGroup: msg.isGroup,
        messageDate: new Date(msg.date),
      }))
    )
    .onConflictDoNothing({ target: Messages.externalId })
    .returning()

  return NextResponse.json({
    inserted: inserted.length,
    total: messages.length,
  })
}

