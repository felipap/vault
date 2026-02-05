// WhatsApp Desktop SQLite message reader
// Reads from: ~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite
//
// Database notes:
// - ZMESSAGEDATE uses Core Data epoch (seconds since Jan 1, 2001)
// - Add 978307200 to convert to Unix timestamp
// - ZISFROMME: 1 = outgoing, 0 = incoming
// - JIDs ending in @g.us are group chats
// - Group member JIDs use @lid (Linked Identity) format for privacy
// - Phone numbers are ONLY available for contacts saved in your address book
//   (via ContactsV2.sqlite). For non-contacts, only name/push name is available.

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
  senderName: string | null
  senderPhoneNumber: string | null // Only available for saved contacts
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

export function getWhatsAppContactsDbPath(): string {
  return join(
    homedir(),
    'Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ContactsV2.sqlite',
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

// Build a mapping of LID/JID to phone number from the contacts database
function buildContactPhoneMap(): Map<string, string> {
  const phoneMap = new Map<string, string>()
  const contactsDbPath = getWhatsAppContactsDbPath()

  if (!existsSync(contactsDbPath)) {
    return phoneMap
  }

  const contactsDb = new Database(contactsDbPath, { readonly: true })
  const rows = contactsDb
    .prepare(
      `SELECT ZLID, ZWHATSAPPID, ZPHONENUMBER 
       FROM ZWAADDRESSBOOKCONTACT 
       WHERE ZPHONENUMBER IS NOT NULL AND ZPHONENUMBER != ''`,
    )
    .all() as Array<{
    ZLID: string | null
    ZWHATSAPPID: string | null
    ZPHONENUMBER: string
  }>

  for (const row of rows) {
    // Map by LID (e.g., "70089604899045@lid" -> "+5521985351995")
    if (row.ZLID) {
      phoneMap.set(row.ZLID, row.ZPHONENUMBER)
    }
    // Map by WhatsApp JID (e.g., "5521985351995@s.whatsapp.net" -> "+5521985351995")
    if (row.ZWHATSAPPID) {
      phoneMap.set(row.ZWHATSAPPID, row.ZPHONENUMBER)
    }
  }

  contactsDb.close()
  return phoneMap
}

export function fetchMessages(
  db: Database.Database,
  since: Date,
): WhatsAppMessage[] {
  // Convert JS Date to Core Data timestamp
  const sinceTimestamp =
    Math.floor(since.getTime() / 1000) - CORE_DATA_EPOCH_OFFSET

  // Build phone number lookup map from contacts database
  // Phone numbers are only available for contacts saved in the user's address book
  const phoneMap = buildContactPhoneMap()

  const rows = db
    .prepare(
      `
    SELECT
      m.Z_PK as id,
      m.ZCHATSESSION as chatSessionId,
      c.ZCONTACTJID as chatJid,
      c.ZPARTNERNAME as chatName,
      m.ZTEXT as text,
      m.ZFROMJID as fromJid,
      gm.ZMEMBERJID as groupMemberJid,
      COALESCE(NULLIF(gm.ZCONTACTNAME, ''), ppn.ZPUSHNAME) as groupMemberName,
      m.ZMESSAGEDATE as messageDate,
      m.ZISFROMME as isFromMe,
      m.ZMESSAGETYPE as messageType,
      m.ZMEDIAITEM as mediaItemId,
      media.ZMEDIALOCALPATH as mediaLocalPath
    FROM ZWAMESSAGE m
    LEFT JOIN ZWACHATSESSION c ON m.ZCHATSESSION = c.Z_PK
    LEFT JOIN ZWAGROUPMEMBER gm ON m.ZGROUPMEMBER = gm.Z_PK
    LEFT JOIN ZWAPROFILEPUSHNAME ppn ON gm.ZMEMBERJID = ppn.ZJID
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
    fromJid: string | null
    groupMemberJid: string | null
    groupMemberName: string | null
    messageDate: number
    isFromMe: number
    messageType: number
    mediaItemId: number | null
    mediaLocalPath: string | null
  }>

  return rows.map((row) => {
    const isGroup = row.chatJid?.endsWith('@g.us') ?? false
    // For group chats, use the group member's JID as the actual sender
    // For individual chats, use fromJid (which is the sender's JID)
    const senderJid = isGroup ? row.groupMemberJid : row.fromJid

    // Look up phone number from contacts by sender JID (LID or WhatsApp JID format)
    const senderPhoneNumber = senderJid ? (phoneMap.get(senderJid) ?? null) : null

    // For individual chats, the chatName is the contact's name
    // For group chats, try to use the group member's contact name (often null)
    const senderName = isGroup ? row.groupMemberName : row.chatName

    return {
      id: String(row.id),
      chatId: row.chatJid ?? String(row.chatSessionId),
      chatName: row.chatName,
      text: row.text,
      senderJid,
      senderName,
      senderPhoneNumber,
      timestamp: coreDataToDate(row.messageDate).toISOString(),
      isFromMe: row.isFromMe === 1,
      messageType: row.messageType,
      hasMedia: row.mediaItemId !== null,
      mediaLocalPath: row.mediaLocalPath,
    }
  })
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
