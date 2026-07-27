import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getBuiltinOAuthClientId, pickOAuthClientId } from '@shared/oauth-config'

export interface OAuthClientConfig {
  clientId: string
  /**
   * Exact scope strings allowed on the OAuth client.
   * Empty/omitted → do not send `scope` (Cloudflare uses the client's registered scopes).
   */
  scopes: string[]
}

function readOAuthClientFile(): { clientId?: string; scopes?: string[] } | null {
  const candidates = [
    join(app.getAppPath(), 'resources', 'oauth-client.json'),
    join(process.resourcesPath, 'oauth-client.json')
  ]
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue
      return JSON.parse(readFileSync(path, 'utf8')) as {
        clientId?: string
        scopes?: string[]
      }
    } catch {
      // ignore
    }
  }
  return null
}

/** Resolve publisher OAuth Client ID (never an end-user field). */
export function resolveOAuthClientId(): string {
  const file = readOAuthClientFile()
  return pickOAuthClientId({
    builtinClientId: getBuiltinOAuthClientId(),
    fileClientId: file?.clientId ?? null,
    envClientId: process.env.CLOUD_TUNNEL_OAUTH_CLIENT_ID
  })
}

/**
 * Scopes to request on authorize.
 * - Explicit `scopes` in oauth-client.json (non-empty) are sent as-is.
 * - Empty `scopes` → omit the scope param so Cloudflare uses whatever is
 *   registered on the OAuth client (avoids invalid_scope when the client is
 *   missing a label). Put intended labels in `recommendedScopes` for docs.
 */
export function resolveOAuthScopes(): string[] {
  const fromEnv = process.env.CLOUD_TUNNEL_OAUTH_SCOPES?.trim()
  if (fromEnv) {
    return fromEnv.split(/[\s,]+/).filter(Boolean)
  }
  const file = readOAuthClientFile()
  if (Array.isArray(file?.scopes) && file.scopes.length > 0) {
    return file.scopes.map((s) => s.trim()).filter(Boolean)
  }
  // Do not fall back to REQUIRED_OAUTH_SCOPES here — requesting labels the
  // OAuth client was not created with causes invalid_scope.
  return []
}

export function resolveOAuthClientConfig(): OAuthClientConfig {
  return {
    clientId: resolveOAuthClientId(),
    scopes: resolveOAuthScopes()
  }
}

export function isOAuthConfigured(): boolean {
  return Boolean(resolveOAuthClientId())
}
