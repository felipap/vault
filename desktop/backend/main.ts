import { app } from 'electron'
import {
  createSettingsWindow,
  getMainWindow,
  showMainWindow,
} from './windows/settings'
import { initTray, destroyTray } from './tray'
import { startAllServices, stopAllServices } from './services'
import { registerIpcHandlers } from './ipc'
import { getDeviceSecret, store } from './store'
import { appendFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

console.log(
  'App version:',
  app.isPackaged ? app.getVersion() : 'dev - not available',
)

//
//
//
//
//

// Wake test heartbeat logger - writes every second to ~/contexter-wake-test.log
const WAKE_TEST_LOG = join(
  homedir(),
  app.isPackaged ? 'contexter-wake.log' : 'contexter-wake-test.log',
)
let heartbeatInterval: NodeJS.Timeout | null = null

function formatTimestamp() {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function startHeartbeat() {
  const log = (msg: string) => {
    const line = `${formatTimestamp()} | ${msg}\n`
    appendFileSync(WAKE_TEST_LOG, line)
  }

  log('=== APP STARTED ===')

  heartbeatInterval = setInterval(() => {
    log('heartbeat')
  }, 1000)
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    const line = `${formatTimestamp()} | === APP STOPPED ===\n`
    appendFileSync(WAKE_TEST_LOG, line)
  }
}

app.setAboutPanelOptions({
  applicationName: `Contexter ${app.isPackaged ? '' : '(dev)'}`,
  copyright: 'Copyright © 2025',
  version: app.getVersion(),
})

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting.')
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  console.warn('second-instance fired')

  // Someone tried to run a second instance, focus our window instead
  const win = getMainWindow()
  if (!win) {
    createSettingsWindow()
    return
  }
  if (win.isMinimized()) {
    win.restore()
  }
  win.show()
  win.focus()
})

function needsConfiguration(): boolean {
  const deviceSecret = getDeviceSecret()
  const serverUrl = store.get('serverUrl')
  return !deviceSecret || !serverUrl
}

// Prevent multiple initialization
let isInitialized = false

app.whenReady().then(async () => {
  if (isInitialized) {
    console.log('App already initialized, skipping...')
    return
  }

  isInitialized = true

  // Hide dock initially - it will show when settings window opens
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  registerIpcHandlers()
  initTray()

  // Only show settings window if configuration is needed
  if (needsConfiguration()) {
    createSettingsWindow()
  }

  await startAllServices()

  // Start wake test heartbeat logger
  startHeartbeat()

  console.log('App initialized')

  // app.on('activate', () => {
  //   // On macOS, when the dock icon is clicked, show the library window
  //   if (!libraryWindow) {
  //     createLibraryWindow()
  //     return
  //   }
  //   if (libraryWindow.isMinimized()) {
  //     libraryWindow.restore()
  //   }
  //   libraryWindow.show()
  //   libraryWindow.focus()
  // })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // The tray will remain available
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS, when the dock icon is clicked, show the main window
  showMainWindow()
})

app.on('before-quit', () => {
  stopHeartbeat()
  stopAllServices()
  destroyTray()
})
