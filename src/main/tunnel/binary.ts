import { app } from 'electron'
import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUNDLED_CLOUDFLARED_VERSION,
  cloudflaredBinaryName,
  cloudflaredPlatformKey
} from './platform'

export {
  BUNDLED_CLOUDFLARED_VERSION,
  cloudflaredBinaryName,
  cloudflaredPlatformKey
} from './platform'

export function getCloudflaredBinaryPath(): string {
  const binaryName = cloudflaredBinaryName()

  if (app.isPackaged) {
    return join(process.resourcesPath, 'cloudflared', binaryName)
  }

  return join(
    app.getAppPath(),
    'resources',
    'cloudflared',
    cloudflaredPlatformKey(),
    binaryName
  )
}

export function ensureCloudflaredExecutable(path: string): void {
  if (process.platform === 'win32') return
  if (!existsSync(path)) return
  try {
    chmodSync(path, 0o755)
  } catch {
    // ignore
  }
}

export function getBundledCloudflaredVersion(): string {
  return BUNDLED_CLOUDFLARED_VERSION
}
