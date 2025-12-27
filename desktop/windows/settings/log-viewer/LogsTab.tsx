import { useEffect, useState } from 'react'
import { ApiRequestLog } from '../../electron'
import { Button } from '../../shared/ui/Button'
import { LogItem, formatDate } from './Item'

export function LogsTab() {
  const [logs, setLogs] = useState<ApiRequestLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function main() {
      const result = await window.electron.getRequestLogs()
      setLogs(result)
      setIsLoading(false)
    }

    main()

    const interval = setInterval(main, 2000)
    return () => {
      clearInterval(interval)
    }
  }, [])

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
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={logs.length === 0}
        >
          Clear Logs
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-color-secondary)] py-12">
          <div className="text-4xl mb-3 opacity-40">📋</div>
          <p>No requests logged yet</p>
          <p className="text-sm mt-1">
            Requests to the context server will appear here
          </p>
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
                const showDate =
                  index === 0 ||
                  formatDate(log.timestamp) !==
                    formatDate(logs[index - 1].timestamp)

                return <LogItem key={log.id} log={log} showDate={showDate} />
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
