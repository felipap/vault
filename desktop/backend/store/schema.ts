import { randomUUID } from 'crypto'

export type ApiRequestLog = {
  id: string
  timestamp: number
  method: string
  url: string
  isError: boolean
  status?: number
  duration: number
  text?: string
}

export type StoreSchema = {
  deviceId: string | null
  deviceSecret: string | null
  encryptionKey: string | null
  serverUrl: string | null
  screenCapture: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
  }
  imessageExport: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
    includeAttachments: boolean
  }
  contactsSync: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
  }
  unipileWhatsapp: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
    apiBaseUrl: string | null
    apiToken: string | null
    accountId: string | null
  }
  requestLogs: ApiRequestLog[]
}

export const DEFAULT_STATE: StoreSchema = {
  deviceId: randomUUID(),
  deviceSecret: null,
  encryptionKey: null,
  serverUrl: null,
  screenCapture: {
    enabled: false,
    intervalMinutes: 5,
    nextSyncAfter: null,
  },
  imessageExport: {
    enabled: false,
    intervalMinutes: 5,
    includeAttachments: true,
    nextSyncAfter: null,
  },
  contactsSync: {
    enabled: false,
    intervalMinutes: 60,
    nextSyncAfter: null,
  },
  unipileWhatsapp: {
    enabled: false,
    intervalMinutes: 5,
    nextSyncAfter: null,
    apiBaseUrl: null,
    apiToken: null,
    accountId: null,
  },
  requestLogs: [],
}
