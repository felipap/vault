import { apiRequest } from '../lib/contexter-api'
import { encryptText } from '../lib/encryption'
import { catchAndComplain } from '../lib/utils'
import {
  fetchAllMessages,
  type UnipileConfig,
  type UnipileMessage,
} from '../sources/unipile'
import { getDeviceId, getEncryptionKey, store } from '../store'
import { startAnimating } from '../tray/animate'
import { createScheduledService } from './scheduler'

function getUnipileConfig(): UnipileConfig | null {
  const config = store.get('unipileWhatsapp')
  if (!config.apiBaseUrl || !config.apiToken || !config.accountId) {
    return null
  }
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiToken: config.apiToken,
    accountId: config.accountId,
  }
}

function encryptMessages(
  messages: UnipileMessage[],
  encryptionKey: string,
): UnipileMessage[] {
  return messages.map((msg) => ({
    ...msg,
    text: msg.text ? encryptText(msg.text, encryptionKey) : msg.text,
    senderName: msg.senderName
      ? encryptText(msg.senderName, encryptionKey)
      : msg.senderName,
  }))
}

async function uploadMessages(
  messages: UnipileMessage[],
): Promise<{ error: string } | object> {
  if (messages.length === 0) {
    return {}
  }

  const encryptionKey = getEncryptionKey()
  const messagesToUpload = encryptionKey
    ? encryptMessages(messages, encryptionKey)
    : messages

  const res = await apiRequest({
    path: '/api/whatsapp-messages',
    body: {
      messages: messagesToUpload,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
  })

  if ('error' in res) {
    return { error: res.error }
  }

  console.log(`[unipile-whatsapp] Uploaded ${messages.length} messages successfully`)
  return {}
}

let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[unipile-whatsapp] Exporting messages...')

  const unipileConfig = getUnipileConfig()
  if (!unipileConfig) {
    throw new Error('Unipile API not configured (missing apiBaseUrl, apiToken, or accountId)')
  }

  const since = lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const messages = await fetchAllMessages(unipileConfig, since)

  if (messages.length === 0) {
    console.log('[unipile-whatsapp] No new messages to export')
    return
  }

  const latestTimestamp = messages.reduce(
    (max, msg) => (msg.timestamp > max ? msg.timestamp : max),
    messages[0].timestamp,
  )

  console.debug('[unipile-whatsapp] Found', messages.length, 'new messages')

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(uploadMessages(messages))
  stopAnimating()

  if ('error' in res) {
    throw new Error(`uploadMessages failed: ${res.error}`)
  }

  lastExportedMessageDate = new Date(latestTimestamp)
}

export const unipileWhatsappService = createScheduledService({
  name: 'unipile-whatsapp',
  configKey: 'unipileWhatsapp',
  onSync: exportAndUpload,
})
