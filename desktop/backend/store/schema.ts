import { randomUUID } from 'crypto'

export type ApiRequestLog = {
  id: string
  timestamp: number
  method: string
  path: string
  status: 'success' | 'error'
  statusCode?: number
  duration: number
  error?: string
}

export type StoreSchema = {
  deviceId: string
  deviceSecret: string
  serverUrl: string | null
  screenCapture: {
    enabled: boolean
    intervalMinutes: number
  }
  imessageExport: {
    enabled: boolean
    intervalMinutes: number
    includeAttachments: boolean
  }
  contactsSync: {
    enabled: boolean
    intervalMinutes: number
  }
  requestLogs: ApiRequestLog[]
}

export const DEFAULT_STATE: StoreSchema = {
  deviceId: randomUUID(),
  deviceSecret: '',
  serverUrl: null,
  screenCapture: {
    enabled: true,
    intervalMinutes: 5,
  },
  imessageExport: {
    enabled: false,
    intervalMinutes: 5,
    includeAttachments: true,
  },
  contactsSync: {
    enabled: false,
    intervalMinutes: 60,
  },
  requestLogs: [],
}
