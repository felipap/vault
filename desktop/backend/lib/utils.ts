import { app, nativeImage, NativeImage } from 'electron'
import { existsSync } from 'fs'
import path from 'path'

export async function tryCatch<T>(
  promise: Promise<T>,
): Promise<[T, null] | [null, Error]> {
  try {
    const data = await promise
    return [data, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
  }
}

export async function catchAndComplain<T>(
  promise: Promise<T>,
): Promise<T | { error: string }> {
  try {
    const data = await promise
    return data
  } catch (error) {
    console.error('THREW:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

function getAssetsPath(name: string): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  return path.join(base, name)
}

export function getImagePath(name: string): NativeImage {
  // Use production icon for dialogs
  const iconPath = getAssetsPath(`icons/${name}`)
  return nativeImage.createFromPath(iconPath)
}

export function getIsOutsideApplicationsFolder(): boolean {
  if (process.platform !== 'darwin') {
    return false
  }
  // On macOS, check if app is in the Applications folder
  return !app.isInApplicationsFolder()
}

export function getIconPath(env?: 'production' | 'development'): string | null {
  // Use app.isPackaged instead of NODE_ENV to reliably detect production
  const currentEnv = env || (app.isPackaged ? 'production' : 'development')

  const possibleIconPaths = [
    path.join(__dirname, '../../assets/icons/', `${currentEnv}.png`),
    path.join(__dirname, '../../assets/icons/', `${currentEnv}.icns`),
    path.join(process.resourcesPath, 'assets/icons/', `${currentEnv}.png`),
    path.join(process.resourcesPath, 'assets/icons/', `${currentEnv}.icns`),
    path.join(process.cwd(), 'assets/icons/', `${currentEnv}.png`),
    path.join(process.cwd(), 'assets/icons/', `${currentEnv}.icns`),
  ]

  for (const path of possibleIconPaths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}

export function findIconPath(): string | null {
  return getIconPath()
}
