import { useState, useEffect } from 'react'
import { ScreenCaptureLocalConfig } from '../../../electron'
import { ScreenRecordingPermission } from '../ScreenRecordingPermission'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { DataSourceLogs } from '../../DataSourceLogs'
import {
  SyncTab,
  ToggleRow,
  IntervalSelect,
  LoadingSkeleton,
  useSyncLogs,
  SyncNowButton,
} from '../shared'

type Props = {
  onEnabledChange: (enabled: boolean) => void
  highlightSyncId: string | null
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every 1 minute' },
  { value: 2, label: 'Every 2 minutes' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
]

const DEFAULT_FOLDER_HINT = '~/Pictures/Vaulty Screenshots (default)'

export const ScreenshotsLocalSyncTab = withBoundary(
  function ScreenshotsLocalSyncTab({ onEnabledChange, highlightSyncId }: Props) {
    const [config, setConfig] = useState<ScreenCaptureLocalConfig | null>(null)
    const logs = useSyncLogs('screenshots-local')

    useEffect(() => {
      window.electron.getServiceConfig('screenCaptureLocal').then(setConfig)
    }, [])

    const handleToggleEnabled = async () => {
      if (!config) {
        return
      }
      const newEnabled = !config.enabled
      await window.electron.setServiceConfig('screenCaptureLocal', {
        enabled: newEnabled,
      })
      setConfig({ ...config, enabled: newEnabled })
      onEnabledChange(newEnabled)
    }

    const handleIntervalChange = async (minutes: number) => {
      if (!config) {
        return
      }
      await window.electron.setServiceConfig('screenCaptureLocal', {
        intervalMinutes: minutes,
      })
      setConfig({ ...config, intervalMinutes: minutes })
    }

    const handlePickFolder = async () => {
      if (!config) {
        return
      }
      const folder = await window.electron.selectFolder()
      if (!folder) {
        return
      }
      await window.electron.setServiceConfig('screenCaptureLocal', {
        outputFolder: folder,
      })
      setConfig({ ...config, outputFolder: folder })
    }

    const handleOpenFolder = () => {
      if (config?.outputFolder) {
        window.electron.openPath(config.outputFolder)
      }
    }

    if (!config) {
      return <LoadingSkeleton />
    }

    return (
      <SyncTab
        title="Screenshots (Local)"
        description="Save resized screenshots to a folder on this Mac at regular intervals. Files stay local — nothing is uploaded."
        footer={
          <DataSourceLogs
            logs={logs}
            highlightSyncId={highlightSyncId}
            sourceLabel="Screenshots (Local)"
          />
        }
      >
        <ScreenRecordingPermission />

        <ToggleRow
          label="Enable"
          enabled={config.enabled}
          onChange={handleToggleEnabled}
        />

        <IntervalSelect
          value={config.intervalMinutes}
          options={INTERVAL_OPTIONS}
          onChange={handleIntervalChange}
          disabled={!config.enabled}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Output folder
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-md border bg-input text-sm truncate">
              {config.outputFolder ?? DEFAULT_FOLDER_HINT}
            </div>
            <button
              onClick={handlePickFolder}
              className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-[var(--background-color-three)]"
            >
              Choose…
            </button>
            <button
              onClick={handleOpenFolder}
              disabled={!config.outputFolder}
              className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-[var(--background-color-three)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open
            </button>
          </div>
        </div>

        <SyncNowButton
          serviceName="screenshots-local"
          disabled={!config.enabled}
        />
      </SyncTab>
    )
  },
)
