export type {
  SyncLog,
  SyncLogSource,
  ServiceConfig,
  IMessageExportConfig,
  ServiceStatus,
  BackfillProgress,
  ElectronAPI,
  UnipileWhatsappConfig,
  McpServerConfig,
  McpServerStatus,
} from '../shared-types'

import type { ElectronAPI } from '../shared-types'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
