import { app } from 'electron'
import log from 'electron-log/main'

const isDev = !app.isPackaged

// app.setName() MUST be called before log.initialize(). It sets where
// electron-log writes files AND where electron-store saves data.
const expectedName = `Vaulty${isDev ? 'Dev' : ''}`
app.setName(expectedName)

log.initialize()

// Sanity check in dev: verify the app name was set correctly
if (isDev) {
  const actualName = app.getName()
  if (actualName !== expectedName) {
    throw new Error(
      `App name mismatch! Expected "${expectedName}" but got "${actualName}". ` +
        `This will cause data to be stored in the wrong location.`,
    )
  }
}

// Scope colors for development console output
const SCOPE_COLORS: Record<string, string> = {
  app: '\x1b[36m', // cyan
  imessage: '\x1b[32m', // green
  screenshots: '\x1b[35m', // magenta
  contacts: '\x1b[33m', // yellow
  unipile: '\x1b[34m', // blue
  api: '\x1b[91m', // bright red
  store: '\x1b[90m', // gray
  keychain: '\x1b[90m', // gray
  encryption: '\x1b[90m', // gray
  updater: '\x1b[96m', // bright cyan
  services: '\x1b[94m', // bright blue
  utils: '\x1b[90m', // gray
}
const RESET = '\x1b[0m'

if (isDev) {
  // Replace transforms: maxDepth (handles circular refs) + our colorizer
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { maxDepth } = require('electron-log/src/node/transforms/object')

  log.transports.console.transforms = [
    maxDepth,
    ({
      data,
      message,
    }: {
      data: unknown[]
      message: { scope?: string; level?: string }
    }) => {
      const scopeName = message.scope || 'main'
      const level = message.level || 'info'
      const scopeColor = SCOPE_COLORS[scopeName] || '\x1b[37m'
      const levelColors: Record<string, string> = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[37m',
        debug: '\x1b[90m',
      }
      const levelColor = levelColors[level] || ''

      // Prepend colored scope, let console.log handle the rest naturally
      return [
        `${scopeColor}[${scopeName}]${RESET}${levelColor}`,
        ...data,
        RESET,
      ]
    },
  ]
}

// Log the output file path
const logFile = log.transports.file.getFile()
log.info(`Logs output: ${logFile.path}`)

// Create a scoped logger for a specific module/service
export function createLogger(scope: string) {
  return log.scope(scope)
}

// Default logger (no scope)
export const logger = log

// Convenience exports for quick logging without a scope
export const debug = log.debug
export const info = log.info
export const warn = log.warn
export const error = log.error
export const logError = log.error
