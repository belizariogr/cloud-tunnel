import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const VERSION = (
  await Bun.file(join(import.meta.dir, '../package.json')).json()
).cloudflaredVersion as string

const ASSETS: Array<{
  platformKey: string
  asset: string
  binaryName: string
}> = [
  {
    platformKey: 'linux-x64',
    asset: 'cloudflared-linux-amd64',
    binaryName: 'cloudflared'
  },
  {
    platformKey: 'linux-arm64',
    asset: 'cloudflared-linux-arm64',
    binaryName: 'cloudflared'
  },
  {
    platformKey: 'darwin-x64',
    asset: 'cloudflared-darwin-amd64.tgz',
    binaryName: 'cloudflared'
  },
  {
    platformKey: 'darwin-arm64',
    asset: 'cloudflared-darwin-arm64.tgz',
    binaryName: 'cloudflared'
  },
  {
    platformKey: 'win32-x64',
    asset: 'cloudflared-windows-amd64.exe',
    binaryName: 'cloudflared.exe'
  }
]

function currentPlatformKey(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  if (process.platform === 'win32') return `win32-${arch}`
  if (process.platform === 'darwin') return `darwin-${arch}`
  return `linux-${arch}`
}

async function download(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  return res.arrayBuffer()
}

async function fetchAsset(
  platformKey: string,
  asset: string,
  binaryName: string,
  force = false
): Promise<void> {
  const dir = join(import.meta.dir, '../resources/cloudflared', platformKey)
  const outPath = join(dir, binaryName)
  if (existsSync(outPath) && !force) {
    console.log(`✓ ${platformKey} already present`)
    return
  }
  mkdirSync(dir, { recursive: true })

  const url = `https://github.com/cloudflare/cloudflared/releases/download/${VERSION}/${asset}`
  console.log(`Downloading ${url}`)
  const buffer = await download(url)

  if (asset.endsWith('.tgz')) {
    const tmp = join(dir, asset)
    await Bun.write(tmp, buffer)
    const proc = Bun.spawn(['tar', '-xzf', tmp, '-C', dir], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    const code = await proc.exited
    if (code !== 0) throw new Error(`tar failed for ${asset}`)
    const extracted = join(dir, 'cloudflared')
    if (extracted !== outPath && existsSync(extracted)) {
      await Bun.write(outPath, Bun.file(extracted))
    }
  } else {
    await Bun.write(outPath, buffer)
  }

  if (!binaryName.endsWith('.exe')) {
    chmodSync(outPath, 0o755)
  }

  const hash = createHash('sha256')
    .update(Buffer.from(await Bun.file(outPath).arrayBuffer()))
    .digest('hex')
  writeFileSync(join(dir, 'SHA256'), `${hash}  ${binaryName}\n`)
  console.log(`✓ ${platformKey} → ${outPath}`)
}

const onlyCurrent = !process.argv.includes('--all')
const force = process.argv.includes('--force')
const targets = onlyCurrent
  ? ASSETS.filter((a) => a.platformKey === currentPlatformKey())
  : ASSETS

if (targets.length === 0) {
  console.error('No matching cloudflared asset for this platform')
  process.exit(1)
}

for (const target of targets) {
  await fetchAsset(target.platformKey, target.asset, target.binaryName, force)
}

console.log(`Pinned cloudflared ${VERSION}`)
