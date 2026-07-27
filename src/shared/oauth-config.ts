/**
 * OAuth for Cloud Tunnel.
 *
 * Model (like “Sign in with Google”):
 * - YOU (app publisher) create one Cloudflare OAuth client once
 * - Client ID is baked into the app at build time
 * - End users only click “Sign in with Cloudflare” — they never see a Client ID
 *
 * Cloudflare does not allow anonymous API login without a registered OAuth app.
 */

export const OAUTH_REDIRECT_URI = 'http://127.0.0.1:53682/callback'

declare const __CLOUD_TUNNEL_OAUTH_CLIENT_ID__: string | undefined

const PLACEHOLDER_CLIENT_IDS = new Set([
  '',
  'PASTE_YOUR_CLOUDFLARE_OAUTH_CLIENT_ID_HERE',
  'your-client-id',
  'CLIENT_ID'
])

/** True when the value looks like a real Cloudflare OAuth Client ID. */
export function isValidOAuthClientId(value: string | null | undefined): boolean {
  const id = value?.trim() ?? ''
  if (!id || PLACEHOLDER_CLIENT_IDS.has(id)) return false
  // Cloudflare client ids are opaque strings; reject obvious placeholders.
  if (/paste|example|changeme|xxx/i.test(id)) return false
  return id.length >= 16
}

/** Baked in at build/dev from resources/oauth-client.json or env. */
export function getBuiltinOAuthClientId(): string {
  try {
    if (typeof __CLOUD_TUNNEL_OAUTH_CLIENT_ID__ === 'string') {
      return __CLOUD_TUNNEL_OAUTH_CLIENT_ID__.trim()
    }
  } catch {
    // bun:test / non-vite
  }
  return ''
}

export function pickOAuthClientId(options: {
  builtinClientId?: string | null
  fileClientId?: string | null
  envClientId?: string | null
}): string {
  const candidates = [
    options.builtinClientId ?? getBuiltinOAuthClientId(),
    options.fileClientId,
    options.envClientId
  ]
  for (const value of candidates) {
    const trimmed = value?.trim()
    if (isValidOAuthClientId(trimmed)) return trimmed!
  }
  return ''
}
