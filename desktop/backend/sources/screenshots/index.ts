import { desktopCapturer, screen } from 'electron'
import { apiFormDataRequest } from '../../lib/contexter-api'

export async function captureScreen(): Promise<Buffer | null> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  })

  if (sources.length === 0) {
    console.error('No screen sources found')
    return null
  }

  const primarySource = sources[0]
  const thumbnail = primarySource.thumbnail

  if (thumbnail.isEmpty()) {
    console.error('Screen capture returned empty thumbnail')
    return null
  }

  const pngBuffer = thumbnail.toPNG()
  if (pngBuffer.length === 0) {
    console.error('Screen capture returned empty PNG buffer')
    return null
  }

  return pngBuffer
}

export async function uploadScreenshot(imageBuffer: Buffer): Promise<void> {
  const formData = new FormData()
  const uint8Array = new Uint8Array(imageBuffer)
  const blob = new Blob([uint8Array], { type: 'image/png' })
  formData.append('screenshot', blob, `screenshot-${Date.now()}.png`)

  await apiFormDataRequest({
    path: '/api/screenshots',
    formData,
  })

  console.log('Screenshot uploaded successfully')
}
