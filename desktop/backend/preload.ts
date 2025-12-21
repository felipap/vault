import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  getRequestLogs: () => ipcRenderer.invoke('get-request-logs'),
  clearRequestLogs: () => ipcRenderer.invoke('clear-request-logs'),
  getScreenCaptureConfig: () => ipcRenderer.invoke('get-screen-capture-config'),
  setScreenCaptureConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
  }) => ipcRenderer.invoke('set-screen-capture-config', config),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url: string) => ipcRenderer.invoke('set-server-url', url),
})
