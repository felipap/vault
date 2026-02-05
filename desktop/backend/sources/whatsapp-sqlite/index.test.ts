import { describe, expect, it } from 'vitest'
import {
  openWhatsAppDatabase,
  fetchChats,
  fetchMessages,
  getChatCount,
  getMessageCount,
  getWhatsAppDatabasePath,
  isWhatsAppInstalled,
} from './index'

describe('whatsapp-sqlite', () => {
  it('should find WhatsApp database path', () => {
    const path = getWhatsAppDatabasePath()
    expect(path).toContain('WhatsApp.shared/ChatStorage.sqlite')
  })

  it('should detect WhatsApp installation', () => {
    const installed = isWhatsAppInstalled()
    // This will be true if WhatsApp Desktop is installed
    console.log('WhatsApp Desktop installed:', installed)
    expect(typeof installed).toBe('boolean')
  })

  // These tests only run if WhatsApp is installed
  describe.skipIf(!isWhatsAppInstalled())('with WhatsApp installed', () => {
    it('should open database and get counts', () => {
      const db = openWhatsAppDatabase()
      try {
        const chatCount = getChatCount(db)
        const messageCount = getMessageCount(db)

        console.log(`Found ${chatCount} chats and ${messageCount} messages`)

        expect(chatCount).toBeGreaterThan(0)
        expect(messageCount).toBeGreaterThan(0)
      } finally {
        db.close()
      }
    })

    it('should fetch chats', () => {
      const db = openWhatsAppDatabase()
      try {
        const chats = fetchChats(db)

        console.log(`Fetched ${chats.length} chats`)
        if (chats.length > 0) {
          console.log('First chat:', chats[0])
        }

        expect(chats.length).toBeGreaterThan(0)
        expect(chats[0]).toHaveProperty('id')
        expect(chats[0]).toHaveProperty('jid')
        expect(chats[0]).toHaveProperty('name')
      } finally {
        db.close()
      }
    })

    it('should fetch recent messages', () => {
      const db = openWhatsAppDatabase()
      try {
        // Fetch messages from last 24 hours
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const messages = fetchMessages(db, since)
        // sort by
        messages.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )

        console.log(`Fetched ${messages.length} messages from last 24 hours`)
        if (messages.length === 0) {
          console.log('No messages found')
        }
        for (let i = 0; i < Math.min(4, messages.length); i++) {
          const message = messages[i]
          console.log(`Message N-${i}:`, {
            id: message.id,
            chatName: message.chatName,
            isFromMe: message.isFromMe,
            timestamp: message.timestamp,
            textPreview: message.text?.slice(0, 50),
          })
        }

        expect(Array.isArray(messages)).toBe(true)
        if (messages.length > 0) {
          expect(messages[0]).toHaveProperty('id')
          expect(messages[0]).toHaveProperty('chatId')
          expect(messages[0]).toHaveProperty('timestamp')
        }
      } finally {
        db.close()
      }
    })
  })
})
