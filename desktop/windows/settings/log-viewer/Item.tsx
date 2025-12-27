import { ApiRequestLog } from '../../electron'

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDate(timestamp: number): string {
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

type Props = {
  log: ApiRequestLog
  showDate: boolean
}

export function LogItem({ log, showDate }: Props) {
  return (
    <tr className="border-b border-[var(--border-color-one)] hover:bg-[var(--background-color-three)]">
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
}
