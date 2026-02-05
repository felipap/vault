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

let sdk: IMessageSDK | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[imessage] Exporting messages...')

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

  console.debug('[imessage] Found', messages.length, 'new messages')

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(uploadMessages(messages))
  stopAnimating()

  if ('error' in res) {
    throw new Error(`uploadMessages failed: ${res.error}`)
  }

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
