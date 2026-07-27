/** Folder key matches electron-builder `${platform}-${arch}` (e.g. linux-x64). */
export function cloudflaredPlatformKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string {
  const normalizedArch = arch === 'arm64' ? 'arm64' : 'x64'
  if (platform === 'win32') return `win32-${normalizedArch}`
  if (platform === 'darwin') return `darwin-${normalizedArch}`
  return `linux-${normalizedArch}`
}

export function cloudflaredBinaryName(
  platform: NodeJS.Platform = process.platform
): string {
  return platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'
}

/** Pinned version declared in package.json (cloudflaredVersion). */
export const BUNDLED_CLOUDFLARED_VERSION = '2025.2.1'
