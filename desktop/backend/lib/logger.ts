import { app } from 'electron'

const isDev = true // !app.isPackaged

function formatMessage(level: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString()
  const message = args
    .map((arg) =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
    )
    .join(' ')
  return `[${timestamp}] [${level}] ${message}`
}

export function debug(...args: unknown[]): void {
  if (isDev) {
    console.debug(formatMessage('DEBUG', ...args))
  }
}

export function info(...args: unknown[]): void {
  console.info(formatMessage('INFO', ...args))
}

export function warn(...args: unknown[]): void {
  console.warn(formatMessage('WARN', ...args))
}

export function error(...args: unknown[]): void {
  console.error(formatMessage('ERROR', ...args))
}

// Alias for error function
export const logError = error

export const logger = {
  debug,
  info,
  warn,
  error,
}
