import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createLogger } from '../../lib/logger'
import { store } from '../../store'
import { captureScreen } from '../screenshots'

const log = createLogger('screenshots-local')

function resolveOutputFolder(): string {
  const configured = store.get('screenCaptureLocal').outputFolder
  if (configured) {
    return configured
  }
  return path.join(app.getPath('pictures'), 'Vaulty Screenshots')
}

export async function captureToLocalFolder(): Promise<string> {
  const buffer = await captureScreen()
  if (!buffer) {
    throw new Error('Failed to capture screen')
  }

  const folder = resolveOutputFolder()
  await fs.mkdir(folder, { recursive: true })

  const stamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
  const filePath = path.join(folder, `screenshot-${stamp}.webp`)
  await fs.writeFile(filePath, buffer)

  log.info(`Saved screenshot to ${filePath}`)
  return filePath
}
