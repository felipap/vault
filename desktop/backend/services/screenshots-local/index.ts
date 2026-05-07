import { createLogger } from '../../lib/logger'
import { captureToLocalFolder } from '../../sources/screenshots-local'
import { createScheduledWriteService, type SyncResult } from '../scheduler'

const log = createLogger('screenshots-local')

async function captureToFolder(): Promise<SyncResult> {
  log.info('Capturing screen for local folder...')
  await captureToLocalFolder()
  return { success: true }
}

export const screenshotsLocalService = createScheduledWriteService({
  name: 'screenshots-local',
  configKey: 'screenCaptureLocal',
  onSync: captureToFolder,
  requiresEncryption: false,
})
