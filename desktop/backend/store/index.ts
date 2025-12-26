// Data is stored at:
// - ~/Library/Application Support/Context/data.json
// - ~/Library/Application Support/ContextDev/data.json (dev)

import { app } from 'electron'
import Store from 'electron-store'
import { MAX_LOGS } from '../config'
import { debug } from '../lib/logger'
import { ApiRequestLog, DEFAULT_STATE, StoreSchema } from './schema'

// Changes where the backend data is stored depending on dev or prod.
app.setName(`Context${app.isPackaged ? '' : 'Dev'}`)

debug('Store path:', app.getPath('userData'))

export const store = new Store<StoreSchema>({
  name: 'data',
  defaults: DEFAULT_STATE,
})

//
//
//
//
//
//
//

export function getDeviceSecret(): string {
  return store.get('deviceSecret')
}

export function setDeviceSecret(secret: string): void {
  store.set('deviceSecret', secret)
}

export function getDeviceId(): string {
  return store.get('deviceId')
}

export function addRequestLog(log: Omit<ApiRequestLog, 'id'>): void {
  const logs = store.get('requestLogs')
  const newLog: ApiRequestLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS)
  store.set('requestLogs', updatedLogs)
}

export function getRequestLogs(): ApiRequestLog[] {
  return store.get('requestLogs')
}

export function clearRequestLogs(): void {
  store.set('requestLogs', [])
}
