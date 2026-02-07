import { IMessageSDK } from '@photon-ai/imessage-kit'
import { catchAndComplain } from '../../lib/utils'
import { createIMessageSDK, fetchMessages } from '../../sources/imessage'
import {
  getLastExportedMessageDate,
  setLastExportedMessageDate,
  store,
} from '../../store'
import { startAnimating } from '../../tray/animate'
import { createScheduledService } from '../scheduler'
import { uploadMessages } from './upload'

export { imessageBackfill } from './backfill'

const BATCH_SIZE = 50

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

let sdk: IMessageSDK | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[imessage] Exporting messages...')
  await yieldToEventLoop()

  if (!sdk) {
    throw new Error('SDK not initialized')
  }

  const config = store.get('imessageExport')
  const lastExported = getLastExportedMessageDate()
  const since = lastExported
    ? new Date(lastExported.getTime() + 1_000)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const messages = await fetchMessages(sdk, since, {
    includeAttachments: config.includeAttachments,
  })

  if (messages.length === 0) {
    console.log('[imessage] No new messages to export')
    return
  }

  const latestDateStr = messages.reduce(
    (max, msg) => (msg.date > max ? msg.date : max),
    messages[0].date,
  )

  console.debug(
    `[imessage] Found ${messages.length.toLocaleString()} new messages`,
  )

  await yieldToEventLoop()

  const stopAnimating = startAnimating('vault-rotation')

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    const res = await catchAndComplain(uploadMessages(batch))
    if ('error' in res) {
      stopAnimating()
      throw new Error(`uploadMessages failed: ${res.error}`)
    }
    await yieldToEventLoop()
  }

  stopAnimating()
  setLastExportedMessageDate(new Date(latestDateStr))
}

export const imessageService = createScheduledService({
  name: 'imessage',
  configKey: 'imessageExport',
  onSync: exportAndUpload,
  onStart: () => {
    sdk = createIMessageSDK()
  },
  onStop: () => {
    if (sdk) {
      sdk.close()
      sdk = null
    }
  },
})
