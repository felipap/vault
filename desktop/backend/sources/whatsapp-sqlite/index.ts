// WhatsApp Desktop SQLite message reader
// Reads from: ~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite
//
// Database notes:
// - ZMESSAGEDATE uses Core Data epoch (seconds since Jan 1, 2001)
// - Add 978307200 to convert to Unix timestamp
// - ZISFROMME: 1 = outgoing, 0 = incoming
// - JIDs ending in @g.us are group chats

import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Core Data epoch offset (Jan 1, 2001 00:00:00 UTC in Unix time)
const CORE_DATA_EPOCH_OFFSET = 978307200

export type WhatsAppMessage = {
  id: string
  chatId: string
  chatName: string | null
  text: string | null
  senderJid: string | null
  timestamp: string
  isFromMe: boolean
  messageType: number
  hasMedia: boolean
  mediaLocalPath: string | null
}

export type WhatsAppChat = {
  id: string
  jid: string
  name: string | null
  lastMessageDate: string | null
  unreadCount: number
  isGroup: boolean
}

export function getWhatsAppDatabasePath(): string {
  return join(
    homedir(),
    'Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite',
  )
}

export function isWhatsAppInstalled(): boolean {
  return existsSync(getWhatsAppDatabasePath())
}

export function openWhatsAppDatabase(): Database.Database {
  const dbPath = getWhatsAppDatabasePath()

  if (!existsSync(dbPath)) {
    throw new Error(
      'WhatsApp Desktop database not found. Is WhatsApp Desktop installed?',
    )
  }

  // Open in read-only mode to avoid conflicts with WhatsApp
  return new Database(dbPath, { readonly: true })
}

function coreDataToDate(timestamp: number): Date {
  return new Date((timestamp + CORE_DATA_EPOCH_OFFSET) * 1000)
}

export function fetchChats(db: Database.Database): WhatsAppChat[] {
  const rows = db
    .prepare(
      `
    SELECT
      Z_PK as id,
      ZCONTACTJID as jid,
      ZPARTNERNAME as name,
      ZLASTMESSAGEDATE as lastMessageDate,
      ZUNREADCOUNT as unreadCount,
      ZSESSIONTYPE as sessionType
    FROM ZWACHATSESSION
    WHERE ZREMOVED = 0 OR ZREMOVED IS NULL
    ORDER BY ZLASTMESSAGEDATE DESC
  `,
    )
    .all() as Array<{
    id: number
    jid: string
    name: string | null
    lastMessageDate: number | null
    unreadCount: number
    sessionType: number
  }>

  return rows.map((row) => ({
    id: String(row.id),
    jid: row.jid,
    name: row.name,
    lastMessageDate: row.lastMessageDate
      ? coreDataToDate(row.lastMessageDate).toISOString()
      : null,
    unreadCount: row.unreadCount ?? 0,
    isGroup: row.jid?.endsWith('@g.us') ?? false,
  }))
}

export function fetchMessages(
  db: Database.Database,
  since: Date,
): WhatsAppMessage[] {
  // Convert JS Date to Core Data timestamp
  const sinceTimestamp =
    Math.floor(since.getTime() / 1000) - CORE_DATA_EPOCH_OFFSET

  const rows = db
    .prepare(
      `
    SELECT
      m.Z_PK as id,
      m.ZCHATSESSION as chatSessionId,
      c.ZCONTACTJID as chatJid,
      c.ZPARTNERNAME as chatName,
      m.ZTEXT as text,
      m.ZFROMJID as senderJid,
      m.ZMESSAGEDATE as messageDate,
      m.ZISFROMME as isFromMe,
      m.ZMESSAGETYPE as messageType,
      m.ZMEDIAITEM as mediaItemId,
      media.ZMEDIALOCALPATH as mediaLocalPath
    FROM ZWAMESSAGE m
    LEFT JOIN ZWACHATSESSION c ON m.ZCHATSESSION = c.Z_PK
    LEFT JOIN ZWAMEDIAITEM media ON m.ZMEDIAITEM = media.Z_PK
    WHERE m.ZMESSAGEDATE > ?
    ORDER BY m.ZMESSAGEDATE ASC
  `,
    )
    .all(sinceTimestamp) as Array<{
    id: number
    chatSessionId: number
    chatJid: string | null
    chatName: string | null
    text: string | null
    senderJid: string | null
    messageDate: number
    isFromMe: number
    messageType: number
    mediaItemId: number | null
    mediaLocalPath: string | null
  }>

  return rows.map((row) => ({
    id: String(row.id),
    chatId: row.chatJid ?? String(row.chatSessionId),
    chatName: row.chatName,
    text: row.text,
    senderJid: row.senderJid,
    timestamp: coreDataToDate(row.messageDate).toISOString(),
    isFromMe: row.isFromMe === 1,
    messageType: row.messageType,
    hasMedia: row.mediaItemId !== null,
    mediaLocalPath: row.mediaLocalPath,
  }))
}

export function getMessageCount(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM ZWAMESSAGE').get() as {
    count: number
  }
  return row.count
}

export function getChatCount(db: Database.Database): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) as count FROM ZWACHATSESSION WHERE ZREMOVED = 0 OR ZREMOVED IS NULL',
    )
    .get() as { count: number }
  return row.count
}
