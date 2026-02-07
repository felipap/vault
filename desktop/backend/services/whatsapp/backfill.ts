import {
  fetchMessagesBatch,
  getMessageCountSince,
  openWhatsAppDatabase,
  type WhatsappSqliteMessage,
} from '../../sources/whatsapp-sqlite'
import { startAnimating } from '../../tray/animate'
import { catchAndComplain } from '../../lib/utils'
import { store } from '../../store'
import type { WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

type BackfillStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
type BackfillPhase = 'loading' | 'uploading'

export type BackfillProgress = {
  status: BackfillStatus
  phase?: BackfillPhase
  current: number
  total: number
  messageCount?: number
  itemsUploaded?: number
  failedPage?: number
  error?: string
}

let backfillInProgress = false
let backfillCancelled = false
let backfillProgress: BackfillProgress = {
  status: 'idle',
  current: 0,
  total: 0,
}

const BATCH_SIZE = 50

function toWhatsAppMessage(msg: WhatsappSqliteMessage): WhatsAppMessage {
  return {
    id: `sqlite-${msg.id}`,
    chatId: msg.chatId,
    chatName: msg.chatName,
    text: msg.text,
    senderJid: msg.senderJid,
    senderName: msg.senderName,
    senderPhoneNumber: msg.senderPhoneNumber,
    timestamp: msg.timestamp,
    isFromMe: msg.isFromMe,
    chatIsGroupChat: msg.chatIsGroupChat,
    messageType: msg.messageType,
    hasMedia: msg.hasMedia,
    attachments: [], // TODO: implement attachment syncing
  }
}

async function runBackfill(days = 120): Promise<void> {
  if (backfillInProgress) {
    console.log('[whatsapp] Backfill already in progress')
    return
  }

  backfillInProgress = true
  backfillCancelled = false
  backfillProgress = {
    status: 'running',
    phase: 'loading',
    current: 0,
    total: 0,
  }

  console.log(`[whatsapp] Starting backfill for ${days} days`)

  const stopAnimating = startAnimating('vault-rotation')
  let db: ReturnType<typeof openWhatsAppDatabase> | null = null

  try {
    db = openWhatsAppDatabase()
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to open WhatsApp database'
    console.error(`[whatsapp] ${errorMessage}`)
    backfillProgress = {
      status: 'error',
      current: 0,
      total: 0,
      error: errorMessage,
    }
    stopAnimating()
    backfillInProgress = false
    return
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const ignoredChatIds = store.get('whatsappSqlite').ignoredChatIds ?? []

  const messageCount = getMessageCountSince(db, since)
  if (messageCount === 0) {
    backfillProgress = {
      status: 'completed',
      current: 0,
      total: 0,
      messageCount: 0,
      itemsUploaded: 0,
    }
    db.close()
    stopAnimating()
    backfillInProgress = false
    return
  }

  const totalBatches = Math.ceil(messageCount / BATCH_SIZE)
  let batchNumber = 0
  let itemsUploaded = 0
  backfillProgress = {
    status: 'running',
    phase: 'uploading',
    current: 0,
    total: totalBatches,
    messageCount,
    itemsUploaded: 0,
  }

  console.log(
    `[whatsapp] Backfilling up to ${messageCount.toLocaleString()} messages in batches (no full load)...`,
  )

  let nextAfterDate: number | undefined = undefined
  let nextAfterId: number | undefined = undefined
  let fetchBatchCount = 0

  while (!backfillCancelled) {
    const { messages: sqliteMessages, nextAfterMessageDate, nextAfterId: nextId } =
      fetchMessagesBatch(db, since, BATCH_SIZE, nextAfterDate, nextAfterId)

    fetchBatchCount++

    const filtered = sqliteMessages.filter(
      (msg) => !ignoredChatIds.includes(msg.chatId),
    )

    if (filtered.length > 0) {
      const batch = filtered.map(toWhatsAppMessage)
      batchNumber++

      const res = await catchAndComplain(uploadWhatsAppMessages(batch, 'sqlite'))
      if ('error' in res) {
        const errorMessage = `Failed to upload page ${batchNumber}. ${itemsUploaded} items uploaded in total.`
        console.error(`[whatsapp] ${errorMessage} Error: ${res.error}`)
        backfillProgress = {
          ...backfillProgress,
          status: 'error',
          failedPage: batchNumber,
          itemsUploaded,
          error: `${errorMessage} Error: ${res.error}`,
        }
        db.close()
        stopAnimating()
        backfillInProgress = false
        return
      }

      itemsUploaded += batch.length
    }

    backfillProgress.current = fetchBatchCount
    backfillProgress.itemsUploaded = itemsUploaded

    if (batchNumber > 0 && batchNumber % 10 === 0) {
      console.log(
        `[whatsapp] Backfill progress: ${itemsUploaded.toLocaleString()} messages uploaded`,
      )
    }

    nextAfterDate = nextAfterMessageDate ?? undefined
    nextAfterId = nextId ?? undefined
    if (nextAfterMessageDate === null) {
      break
    }
  }

  if (backfillCancelled) {
    backfillProgress = {
      ...backfillProgress,
      status: 'cancelled',
      itemsUploaded,
    }
    console.log(
      `[whatsapp] Backfill cancelled. ${itemsUploaded} items uploaded.`,
    )
  } else {
    backfillProgress = {
      ...backfillProgress,
      status: 'completed',
      itemsUploaded,
    }
    console.log(
      `[whatsapp] Backfill completed. ${itemsUploaded} items uploaded.`,
    )
  }

  db.close()
  stopAnimating()
  backfillInProgress = false
}

function cancelBackfill(): void {
  if (backfillInProgress) {
    backfillCancelled = true
    console.log('[whatsapp] Cancelling backfill...')
  }
}

function getBackfillProgress(): BackfillProgress {
  return { ...backfillProgress }
}

export const whatsappBackfill = {
  run: runBackfill,
  cancel: cancelBackfill,
  getProgress: getBackfillProgress,
}
