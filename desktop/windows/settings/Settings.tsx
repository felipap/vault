import { useState, useEffect, useCallback } from 'react'
import { ApiRequestLog, ScreenCaptureConfig } from '../electron'
import { Button } from '../shared/ui/Button'

type Tab = 'general' | 'logs'

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: 'success' | 'error' }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      Error
    </span>
  )
}

function LogsTab() {
  const [logs, setLogs] = useState<ApiRequestLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const result = await window.electron.getRequestLogs()
    setLogs(result)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const handleClear = async () => {
    await window.electron.clearRequestLogs()
    setLogs([])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-color-secondary)]">
        Loading logs...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Request Logs</h2>
        <Button variant="secondary" size="sm" onClick={handleClear} disabled={logs.length === 0}>
          Clear Logs
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-color-secondary)] py-12">
          <div className="text-4xl mb-3 opacity-40">📋</div>
          <p>No requests logged yet</p>
          <p className="text-sm mt-1">Requests to the context server will appear here</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--background-color-one)]">
              <tr className="text-left text-[var(--text-color-secondary)] border-b">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Path</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const showDate = index === 0 ||
                  formatDate(log.timestamp) !== formatDate(logs[index - 1].timestamp)

                return (
                  <tr key={log.id} className="border-b border-[var(--border-color-one)] hover:bg-[var(--background-color-three)]">
                    <td className="py-2.5 font-mono text-xs">
                      {showDate && (
                        <span className="text-[var(--text-color-secondary)] mr-1.5">
                          {formatDate(log.timestamp)}
                        </span>
                      )}
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--background-color-three)]">
                        {log.method}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-xs text-[var(--text-color-secondary)]">
                      {log.path}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={log.status} />
                      {log.error && (
                        <span className="ml-2 text-xs text-red-500 dark:text-red-400">
                          {log.error}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs text-[var(--text-color-secondary)]">
                      {log.duration}ms
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function GeneralTab() {
  const [serverUrl, setServerUrl] = useState('')
  const [config, setConfig] = useState<ScreenCaptureConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [url, captureConfig] = await Promise.all([
        window.electron.getServerUrl(),
        window.electron.getScreenCaptureConfig(),
      ])
      setServerUrl(url)
      setConfig(captureConfig)
      setIsLoading(false)
    }
    load()
  }, [])

  const handleServerUrlBlur = async () => {
    await window.electron.setServerUrl(serverUrl)
  }

  const handleIntervalChange = async (minutes: number) => {
    await window.electron.setScreenCaptureConfig({ intervalMinutes: minutes })
    setConfig(prev => prev ? { ...prev, intervalMinutes: minutes } : null)
  }

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setScreenCaptureConfig({ enabled: newEnabled })
    setConfig(prev => prev ? { ...prev, enabled: newEnabled } : null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-color-secondary)]">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Server URL
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onBlur={handleServerUrlBlur}
              className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3000"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Screen Capture</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Screen Capture</div>
              <div className="text-sm text-[var(--text-color-secondary)]">
                Automatically capture screenshots at regular intervals
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config?.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Capture Interval
            </label>
            <select
              value={config?.intervalMinutes || 5}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Every 1 minute</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-[var(--text-color-secondary)] hover:text-[var(--color-contrast)]'
      }`}
    >
      {children}
    </button>
  )
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  return (
    <div className="h-screen flex flex-col bg-[var(--background-color-one)]">
      <div className="flex-shrink-0 border-b px-4 pt-2">
        <div className="flex gap-2">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
            General
          </TabButton>
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
            Logs
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  )
}
