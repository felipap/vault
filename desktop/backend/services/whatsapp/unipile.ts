import { catchAndComplain } from '../../lib/utils'
import {
  fetchAllMessages,
  type UnipileConfig,
  type UnipileMessage,
} from '../../sources/whatsapp-unipile'
import { store } from '../../store'
import { startAnimating } from '../../tray/animate'
import { createScheduledService } from '../scheduler'
import type { WhatsAppAttachment, WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

const BATCH_SIZE = 50

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

function getUnipileConfig(): UnipileConfig | null {
  const config = store.get('whatsappUnipile')
  if (!config.apiBaseUrl || !config.apiToken || !config.accountId) {
    return null
  }
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiToken: config.apiToken,
    accountId: config.accountId,
  }
}

function toWhatsAppMessage(msg: UnipileMessage): WhatsAppMessage {
  return {
    id: `unipile-${msg.id}`,
    chatId: msg.chatId,
    chatName: null,
    text: msg.text,
    senderJid: msg.sender,
    senderName: msg.senderName,
    senderPhoneNumber: null,
    timestamp: msg.timestamp,
    messageType: 0,
    isFromMe: msg.isFromMe,
    chatIsGroupChat: msg.chatId.endsWith("@g.us"),
    hasMedia: msg.attachments.length > 0,
    attachments: msg.attachments.map(
      (att): WhatsAppAttachment => ({
        id: `unipile-${att.id}`,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        localPath: null,
        dataBase64: att.dataBase64 ?? null,
      }),
    ),
  }
}

let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[whatsapp-unipile] Exporting messages...')
  await yieldToEventLoop()

  const unipileConfig = getUnipileConfig()
  if (!unipileConfig) {
    throw new Error(
      'Unipile API not configured (missing apiBaseUrl, apiToken, or accountId)',
    )
  }

  const since =
    lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const unipileMessages = await fetchAllMessages(unipileConfig, since)

  if (unipileMessages.length === 0) {
    console.log('[whatsapp-unipile] No new messages to export')
    return
  }

  const messages = unipileMessages.map(toWhatsAppMessage)

  const latestTimestamp = messages.reduce(
    (max, msg) => (msg.timestamp > max ? msg.timestamp : max),
    messages[0].timestamp,
  )

  console.debug('[whatsapp-unipile] Found', messages.length, 'new messages')

  await yieldToEventLoop()

  const stopAnimating = startAnimating('vault-rotation')

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    const res = await catchAndComplain(
      uploadWhatsAppMessages(batch, 'unipile'),
    )
    if ('error' in res) {
      stopAnimating()
      throw new Error(`uploadWhatsAppMessages failed: ${res.error}`)
    }
    await yieldToEventLoop()
  }

  stopAnimating()
  lastExportedMessageDate = new Date(latestTimestamp)
}

export const whatsappUnipileService = createScheduledService({
  name: 'whatsapp-unipile',
  configKey: 'whatsappUnipile',
  onSync: exportAndUpload,
})
