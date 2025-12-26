import { IMessageSDK } from '@photon-ai/imessage-kit'
import { store } from '../store'
import { startAnimating, stopAnimating } from '../tray/animate'
import {
  createIMessageSDK,
  fetchMessages,
  type Message,
} from '../sources/imessage'
import { apiRequest } from '../lib/contexter-api'
import type { Service } from './index'

async function uploadMessages(
  messages: Message[],
): Promise<{ error: string } | void> {
  if (messages.length === 0) {
    return
  }

  const res = await apiRequest({
    path: '/api/messages',
    body: { messages },
  })
  if ('error' in res) {
    return { error: res.error }
  }

  console.log(`Uploaded ${messages.length} messages successfully`)
}

let sdk: IMessageSDK | null = null
let exportInterval: NodeJS.Timeout | null = null
let nextExportTime: Date | null = null
let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[imessage] Exporting messages...')

  if (!sdk) {
    return
  }

  const since =
    lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const messages = await fetchMessages(sdk, since)

  if (messages.length === 0) {
    console.log('[imessage] No new messages to export')
    return
  }

  const latestDate = messages.reduce(
    (max, msg) => (msg.date > max ? msg.date : max),
    messages[0].date,
  )

  startAnimating('old')
  try {
    await uploadMessages(messages)
    lastExportedMessageDate = latestDate
  } catch (error) {
    console.error('[imessage] Failed to upload messages:', error)
  } finally {
    stopAnimating()
  }
}

function scheduleNextExport(): void {
  const config = store.get('imessageExport')
  const intervalMs = config.intervalMinutes * 60 * 1000

  nextExportTime = new Date(Date.now() + intervalMs)

  exportInterval = setTimeout(async () => {
    await exportAndUpload()
    scheduleNextExport()
  }, intervalMs)
}

async function start(): Promise<void> {
  if (exportInterval) {
    console.log('[imessage] Already running')
    return
  }

  const config = store.get('imessageExport')
  if (!config.enabled) {
    console.log('[imessage] Disabled')
    return
  }

  console.log('[imessage] Starting...')

  sdk = createIMessageSDK()

  // Do initial export, but don't let failures prevent scheduling
  try {
    await exportAndUpload()
  } catch (error) {
    console.error('[imessage] Initial export failed:', error)
  }

  scheduleNextExport()
}

function stop(): void {
  if (exportInterval) {
    clearTimeout(exportInterval)
    exportInterval = null
    nextExportTime = null
    console.log('[imessage] Stopped')
  }

  if (sdk) {
    sdk.close()
    sdk = null
  }
}

function restart(): void {
  stop()
  start()
}

function isRunning(): boolean {
  return exportInterval !== null
}

async function runNow(): Promise<void> {
  if (!sdk) {
    sdk = createIMessageSDK()
  }
  await exportAndUpload()
}

function getNextRunTime(): Date | null {
  return nextExportTime
}

function getTimeUntilNextRun(): number {
  if (!nextExportTime) {
    return 0
  }
  return Math.max(0, nextExportTime.getTime() - Date.now())
}

export const imessageService: Service = {
  name: 'imessage',
  start,
  stop,
  restart,
  isRunning,
  runNow,
  getNextRunTime,
  getTimeUntilNextRun,
}
