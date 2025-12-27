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
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getDeviceSecret: () => ipcRenderer.invoke('get-device-secret'),
  setDeviceSecret: (secret: string) =>
    ipcRenderer.invoke('set-device-secret', secret),
})
