import {
  app,
  Menu,
  MenuItemConstructorOptions,
  shell,
  Tray,
  nativeImage,
} from 'electron'
import path from 'path'
import { SERVICES, Service } from '../services'
import { getMcpServerPort, startMcpServer, stopMcpServer } from '../local-mcp'
import { getEncryptionKey, store } from '../store'
import { showMainWindow } from '../windows/settings'

let tray: Tray | null = null
let updateInterval: NodeJS.Timeout | null = null

const SERVICE_LABELS: Record<string, string> = {
  screenshots: 'Screenshots',
  imessage: 'iMessage',
  contacts: 'Contacts',
}

export function getAssetsPath(name: string): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../../assets')
  return path.join(base, name)
}

function formatTimeUntilNextRun(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

function createTrayIcon(): Tray {
  const iconPath = getAssetsPath('tray-default.png')
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)
  tray.setToolTip('Context')

  updateTrayMenu()

  return tray
}

function updateTrayMenu(): void {
  if (!tray) {
    return
  }

  function buildServiceMenuItems(
    service: Service,
  ): MenuItemConstructorOptions[] {
    const label = SERVICE_LABELS[service.name] || service.name
    const isEnabled = service.isEnabled()

    if (!isEnabled) {
      return [
        {
          label: `${label} (disabled)`,
          enabled: false,
        },
      ]
    }

    const isRunning = service.isRunning()
    const timeUntilNext = formatTimeUntilNextRun(service.getTimeUntilNextRun())
    const lastSyncStatus = service.getLastSyncStatus()

    const items: MenuItemConstructorOptions[] = [
      {
        label,
        enabled: false,
      },
      {
        label: isRunning ? `  Next: ${timeUntilNext}` : '  Not running',
        enabled: false,
      },
    ]

    if (lastSyncStatus === 'error') {
      const lastFailedSyncId = service.getLastFailedSyncId()
      items.push({
        label: '  ⚠️ Last sync failed',
        click: () => {
          showMainWindow({
            tab: 'logs',
            highlightSyncId: lastFailedSyncId ?? undefined,
          })
        },
      })
    }

    items.push({
      label: '  Run Now',
      click: () => {
        service.runNow()
      },
    })

    return items
  }

  const serviceMenuItems: MenuItemConstructorOptions[] = []

  for (const service of SERVICES) {
    if (serviceMenuItems.length > 0) {
      serviceMenuItems.push({ type: 'separator' })
    }
    serviceMenuItems.push(...buildServiceMenuItems(service))
  }

  const serverUrl = store.get('serverUrl')
  const encryptionKey = getEncryptionKey()
  const canOpenDashboard = Boolean(serverUrl && encryptionKey)

  const mcpConfig = store.get('mcpServer')
  const mcpPort = getMcpServerPort()
  const mcpRunning = mcpPort !== null

  const contextMenu = Menu.buildFromTemplate([
    ...serviceMenuItems,
    { type: 'separator' },
    {
      label: mcpRunning
        ? `MCP Server (port ${mcpPort})`
        : 'MCP Server (stopped)',
      submenu: [
        {
          label: mcpConfig.enabled ? 'Disable' : 'Enable',
          click: async () => {
            const newEnabled = !mcpConfig.enabled
            store.set('mcpServer', { ...mcpConfig, enabled: newEnabled })
            if (newEnabled) {
              await startMcpServer(mcpConfig.port)
            } else {
              stopMcpServer()
            }
            updateTrayMenu()
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: `Open Dashboard ${app.isPackaged ? '' : '(DEV)'}`,
      enabled: canOpenDashboard,
      click: () => {
        if (serverUrl && encryptionKey) {
          const url = new URL('/dashboard', serverUrl)
          url.searchParams.set('key', encryptionKey)
          shell.openExternal(url.toString())
        }
      },
    },
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function startTrayUpdates(): void {
  updateInterval = setInterval(() => {
    updateTrayMenu()
  }, 1000)
}

function stopTrayUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

export function initTray(): Tray {
  const tray = createTrayIcon()
  startTrayUpdates()
  return tray
}

export function destroyTray(): void {
  stopTrayUpdates()
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function setTrayIcon(iconName: string): void {
  if (!tray) {
    return
  }

  const iconPath = getAssetsPath(iconName)
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  trayIcon.setTemplateImage(true)

  tray.setImage(trayIcon)
}

export function refreshTrayMenu(): void {
  updateTrayMenu()
}
