/**
 * List Cloudflare OAuth scopes and optionally sync matching ones into
 * resources/oauth-client.json.
 *
 * Requires: CLOUDFLARE_API_TOKEN (any token works — endpoint has no role gate)
 *
 *   bun run scripts/fetch-oauth-scopes.ts
 *   bun run scripts/fetch-oauth-scopes.ts --write
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REQUIRED_OAUTH_SCOPES } from '../src/shared/oauth-scopes'

interface OAuthScope {
  id: string
  name: string
  category?: string
  scopes?: string[]
}

const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
if (!token) {
  console.error(
    'Set CLOUDFLARE_API_TOKEN then re-run.\nExample:\n  CLOUDFLARE_API_TOKEN=... bun run scripts/fetch-oauth-scopes.ts --write'
  )
  process.exit(1)
}

const res = await fetch('https://api.cloudflare.com/client/v4/oauth/scopes', {
  headers: { Authorization: `Bearer ${token}` }
})
const json = (await res.json()) as {
  success: boolean
  errors?: Array<{ message: string }>
  result?: OAuthScope[]
}

if (!res.ok || !json.success || !json.result) {
  console.error('Failed to list OAuth scopes:', json.errors ?? res.status)
  process.exit(1)
}

const all = json.result
const keywords = /tunnel|dns|zone|account\.read|account read|connector|cloudflared/i
const relevant = all.filter(
  (s) => keywords.test(s.id) || keywords.test(s.name) || keywords.test(s.category ?? '')
)

console.log(`Total OAuth scopes: ${all.length}`)
console.log(`Relevant (tunnel/dns/zone/account): ${relevant.length}\n`)
for (const s of relevant.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`${s.id.padEnd(40)}  ${s.name}`)
}

console.log('\nRequired by Cloud Tunnel (from docs):')
for (const id of REQUIRED_OAUTH_SCOPES) {
  const found = all.find((s) => s.id === id)
  console.log(`  ${found ? '✓' : '✗'} ${id}${found ? ` — ${found.name}` : ' — NOT in /oauth/scopes'}`)
}

if (!process.argv.includes('--write')) {
  console.log('\nPass --write to update resources/oauth-client.json scopes from matches.')
  process.exit(0)
}

const outPath = join(import.meta.dir, '../resources/oauth-client.json')
const existing = existsSync(outPath)
  ? (JSON.parse(readFileSync(outPath, 'utf8')) as {
      clientId?: string
      scopes?: string[]
    })
  : {}

const availableRequired = REQUIRED_OAUTH_SCOPES.filter((id) =>
  all.some((s) => s.id === id)
)
const missing = REQUIRED_OAUTH_SCOPES.filter((id) => !availableRequired.includes(id))

const next = {
  clientId: existing.clientId ?? '',
  scopes: [...availableRequired]
}

writeFileSync(outPath, JSON.stringify(next, null, 2) + '\n', 'utf8')
console.log(`\nWrote ${outPath}`)
console.log(`scopes: ${next.scopes.join(', ') || '(none)'}`)
if (missing.length) {
  console.warn(
    `\nWARNING: these documented scopes are not offered by Cloudflare OAuth yet:\n  ${missing.join(', ')}\nUse API Token login for those capabilities, or re-check the dashboard.`
  )
}
