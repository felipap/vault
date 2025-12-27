import { useState, useEffect } from 'react'
import { ServiceConfig } from '../../../electron'
import { FullDiskPermission } from './FullDiskPermission'

export type ServiceInfo = {
  name: string
  label: string
  description: string
  getConfig: () => Promise<ServiceConfig>
  setConfig: (config: Partial<ServiceConfig>) => Promise<void>
  intervalOptions: { value: number; label: string }[]
}

export const SERVICES: ServiceInfo[] = [
  {
    name: 'screenshots',
    label: 'Screen Capture',
    description: 'Automatically capture screenshots at regular intervals',
    getConfig: () => window.electron.getScreenCaptureConfig(),
    setConfig: (config) => window.electron.setScreenCaptureConfig(config),
    intervalOptions: [
      { value: 1, label: 'Every 1 minute' },
      { value: 2, label: 'Every 2 minutes' },
      { value: 5, label: 'Every 5 minutes' },
      { value: 10, label: 'Every 10 minutes' },
      { value: 15, label: 'Every 15 minutes' },
      { value: 30, label: 'Every 30 minutes' },
    ],
  },
  {
    name: 'imessage',
    label: 'iMessage Export',
    description: 'Export iMessage conversations to the server',
    getConfig: () => window.electron.getIMessageExportConfig(),
    setConfig: (config) => window.electron.setIMessageExportConfig(config),
    intervalOptions: [
      { value: 1, label: 'Every 1 minute' },
      { value: 5, label: 'Every 5 minutes' },
      { value: 15, label: 'Every 15 minutes' },
      { value: 30, label: 'Every 30 minutes' },
      { value: 60, label: 'Every hour' },
    ],
  },
  {
    name: 'contacts',
    label: 'Contacts Sync',
    description: 'Sync your contacts to the server',
    getConfig: () => window.electron.getContactsSyncConfig(),
    setConfig: (config) => window.electron.setContactsSyncConfig(config),
    intervalOptions: [
      { value: 30, label: 'Every 30 minutes' },
      { value: 60, label: 'Every hour' },
      { value: 360, label: 'Every 6 hours' },
      { value: 720, label: 'Every 12 hours' },
      { value: 1440, label: 'Every 24 hours' },
    ],
  },
]

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function ServiceSection({ service }: { service: ServiceInfo }) {
  const [config, setConfig] = useState<ServiceConfig | null>(null)

  useEffect(() => {
    service.getConfig().then(setConfig)
  }, [service])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await service.setConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await service.setConfig({ intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  if (!config) {
    return null
  }

  return (
    <div className="space-y-4">
      {service.name === 'imessage' && <FullDiskPermission serviceName="imessage" />}

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{service.label}</div>
          <div className="text-sm text-[var(--text-color-secondary)]">
            {service.description}
          </div>
        </div>
        <Toggle enabled={config.enabled} onChange={handleToggleEnabled} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Interval</label>
        <select
          value={config.intervalMinutes}
          onChange={(e) => handleIntervalChange(Number(e.target.value))}
          disabled={!config.enabled}
          className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {service.intervalOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
