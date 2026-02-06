import { useState } from 'react'
import { Button } from '../../shared/ui/Button'
import {
  HistoryIcon,
  CheckCircleIcon,
  LoadingSpinnerIcon,
} from '../../shared/ui/icons'
import {
  useBackfillState,
  formatElapsedTime,
} from './useBackfillState'

export type HistoricalBackfillTheme = 'green' | 'blue'

const THEME_CLASSES: Record<
  HistoricalBackfillTheme,
  {
    container: string
    icon: string
    title: string
    description: string
    label: string
    input: string
    spinner: string
    elapsed: string
    progressBar: string
    progressFill: string
    success: string
  }
> = {
  green: {
    container:
      'rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 space-y-3',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-800 dark:text-green-200',
    description: 'text-green-700 dark:text-green-300',
    label: 'text-green-700 dark:text-green-300',
    input:
      'border-green-300 dark:border-green-700 bg-white dark:bg-green-900/30 text-green-800 dark:text-green-200',
    spinner: 'text-green-600 dark:text-green-400',
    elapsed: 'text-green-600 dark:text-green-400',
    progressBar: 'bg-green-200 dark:bg-green-800',
    progressFill: 'bg-green-500 dark:bg-green-400',
    success: 'text-green-600 dark:text-green-400',
  },
  blue: {
    container:
      'rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
    description: 'text-blue-700 dark:text-blue-300',
    label: 'text-blue-700 dark:text-blue-300',
    input:
      'border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    spinner: 'text-blue-600 dark:text-blue-400',
    elapsed: 'text-blue-600 dark:text-blue-400',
    progressBar: 'bg-blue-200 dark:bg-blue-800',
    progressFill: 'bg-blue-500 dark:bg-blue-400',
    success: 'text-green-600 dark:text-green-400',
  },
}

export type HistoricalBackfillProps = {
  theme: HistoricalBackfillTheme
  backfillKey: string
  getProgress: () => Promise<import('../../electron').BackfillProgress>
  startBackfill: (days: number) => void
  cancelBackfill: () => void
  defaultDays?: number
  title?: string
  description?: string
  loadingLabel?: string
}

export function HistoricalBackfill({
  theme,
  backfillKey,
  getProgress,
  startBackfill,
  cancelBackfill,
  defaultDays = 50,
  title = 'Historical Backfill',
  description = 'Import historical messages. This may take a while for large date ranges.',
  loadingLabel = 'Loading messages...',
}: HistoricalBackfillProps) {
  const [days, setDays] = useState(defaultDays)
  const {
    progress,
    setProgress,
    elapsedSeconds,
    isRunning,
    isLoading,
    isUploading,
    isIdle,
    isCompleted,
    isError,
    isCancelled,
    progressPercent,
  } = useBackfillState({ key: backfillKey, getProgress })

  const classes = THEME_CLASSES[theme]

  const handleStart = () => {
    setProgress({
      current: 0,
      total: days,
      status: 'running',
    })
    startBackfill(days)
  }

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > 0) {
      setDays(value)
    }
  }

  const totalMessages = progress?.messageCount
  const uploadedCount = progress?.itemsUploaded ?? 0

  return (
    <div className={classes.container}>
      <div className="flex items-start gap-2">
        <HistoryIcon className={`${classes.icon} shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${classes.title}`}>{title}</p>
          <p className={`text-xs ${classes.description} mt-1`}>
            {description}
          </p>
        </div>
      </div>

      {!isRunning && (
        <div className="flex items-center gap-2">
          <label className={`text-xs ${classes.label}`}>
            Days to import:
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={handleDaysChange}
            className={`w-20 px-2 py-1 text-xs border rounded ${classes.input}`}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between text-xs ${classes.description}`}
          >
            <div className="flex items-center gap-2">
              <LoadingSpinnerIcon
                className={`animate-spin ${classes.spinner}`}
              />
              <span>{loadingLabel}</span>
            </div>
            <ElapsedTime seconds={elapsedSeconds} className={classes.elapsed} />
          </div>
          <div
            className={`h-2 ${classes.progressBar} rounded-full overflow-hidden`}
          >
            <div
              className={`h-full ${classes.progressFill} animate-pulse w-full`}
            />
          </div>
        </div>
      )}

      {isUploading && progress && (
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between text-xs ${classes.description}`}
          >
            <span>
              Uploading{' '}
              {totalMessages != null
                ? `${uploadedCount.toLocaleString()} of ${totalMessages.toLocaleString()} messages`
                : `${uploadedCount.toLocaleString()} messages`}
              ...
            </span>
            <div className="flex items-center gap-3">
              <ElapsedTime seconds={elapsedSeconds} className={classes.elapsed} />
              <span>{progressPercent}%</span>
            </div>
          </div>
          <div
            className={`h-2 ${classes.progressBar} rounded-full overflow-hidden`}
          >
            <div
              className={`h-full ${classes.progressFill} transition-all duration-300`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isCompleted && (
        <div className={`flex items-center gap-2 text-sm ${classes.success}`}>
          <CheckCircleIcon className={classes.success} />
          <span>Backfill completed successfully!</span>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <span>Backfill was cancelled</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span>Error: {progress?.error ?? 'Unknown error'}</span>
        </div>
      )}

      <div className="flex gap-2">
        {isRunning ? (
          <Button variant="danger" size="sm" onClick={cancelBackfill}>
            Cancel
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleStart}>
            {isIdle ? 'Start Backfill' : 'Run Again'}
          </Button>
        )}
      </div>
    </div>
  )
}

function ElapsedTime({
  seconds,
  className,
}: {
  seconds: number
  className: string
}) {
  return (
    <span className={`font-mono ${className}`}>
      {formatElapsedTime(seconds)}
    </span>
  )
}
