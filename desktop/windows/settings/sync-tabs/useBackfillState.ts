import { useState, useEffect, useRef } from 'react'
import type { BackfillProgress } from '../../electron'

const POLL_INTERVAL_MS = 500
const ELAPSED_TICK_MS = 1000

const runStartTimeByKey: Record<string, number> = {}

function getElapsedSeconds(key: string): number {
  const start = runStartTimeByKey[key]
  if (start == null) {
    return 0
  }
  return Math.floor((Date.now() - start) / 1000)
}

export type UseBackfillStateOptions = {
  key: string
  getProgress: () => Promise<BackfillProgress>
}

export function useBackfillState({
  key,
  getProgress,
}: UseBackfillStateOptions) {
  const [progress, setProgress] = useState<BackfillProgress | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRunning = progress?.status === 'running'
  const isLoading = isRunning && progress?.phase === 'loading'
  const isUploading = isRunning && progress?.phase === 'uploading'
  const isIdle = !progress || progress.status === 'idle'
  const isCompleted = progress?.status === 'completed'
  const isError = progress?.status === 'error'
  const isCancelled = progress?.status === 'cancelled'

  useEffect(() => {
    getProgress().then(setProgress)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [getProgress])

  useEffect(() => {
    if (isRunning) {
      if (runStartTimeByKey[key] == null) {
        runStartTimeByKey[key] = Date.now()
        setElapsedSeconds(0)
      } else {
        setElapsedSeconds(getElapsedSeconds(key))
      }

      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          const p = await getProgress()
          setProgress(p)
          if (p.status !== 'running' && pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }, POLL_INTERVAL_MS)
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (
        progress?.status === 'completed' ||
        progress?.status === 'error' ||
        progress?.status === 'cancelled'
      ) {
        delete runStartTimeByKey[key]
      }
    }

    return () => {
      if (!isRunning && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isRunning, key, getProgress, progress?.status])

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(key))
    }, ELAPSED_TICK_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRunning, key])

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return {
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
  }
}

export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}
