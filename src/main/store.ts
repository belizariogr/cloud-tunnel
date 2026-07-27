import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings, TunnelLocalPrefs } from '@shared/types'
import type { OAuthTokens } from './auth/oauth'

interface PersistedAuth {
  mode: 'oauth' | 'api_token' | null
  /** Encrypted blob (base64) when safeStorage is available, else plaintext for fallback */
  secret?: string
  encrypted: boolean
  oauth?: {
    refreshToken?: string
    expiresAt?: number
    tokenType?: string
  }
}

interface PersistedState {
  settings: AppSettings
  auth: PersistedAuth
  tunnelPrefs: Record<string, TunnelLocalPrefs>
  tunnelTokens: Record<string, { encrypted: boolean; value: string }>
}

const DEFAULT_SETTINGS: AppSettings = {
  accountId: null,
  restoreActiveOnLaunch: true
}

function defaultState(): PersistedState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    auth: { mode: null, encrypted: false },
    tunnelPrefs: {},
    tunnelTokens: {}
  }
}

export class Store {
  private path: string
  private state: PersistedState

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.path = join(dir, 'config.json')
    this.state = this.load()
  }

  private load(): PersistedState {
    try {
      if (!existsSync(this.path)) return defaultState()
      const raw = readFileSync(this.path, 'utf8')
      const parsed = JSON.parse(raw) as PersistedState
      return {
        ...defaultState(),
        ...parsed,
        settings: {
          ...DEFAULT_SETTINGS,
          accountId: parsed.settings?.accountId ?? null,
          restoreActiveOnLaunch:
            parsed.settings?.restoreActiveOnLaunch ?? true
        },
        auth: { ...defaultState().auth, ...parsed.auth },
        tunnelPrefs: parsed.tunnelPrefs ?? {},
        tunnelTokens: parsed.tunnelTokens ?? {}
      }
    } catch {
      return defaultState()
    }
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.state, null, 2), 'utf8')
  }

  getSettings(): AppSettings {
    return { ...this.state.settings }
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.state.settings = { ...this.state.settings, ...partial }
    this.save()
    return this.getSettings()
  }

  private encrypt(value: string): { encrypted: boolean; value: string } {
    if (safeStorage.isEncryptionAvailable()) {
      return {
        encrypted: true,
        value: safeStorage.encryptString(value).toString('base64')
      }
    }
    return { encrypted: false, value }
  }

  private decrypt(blob: { encrypted: boolean; value: string }): string {
    if (blob.encrypted) {
      return safeStorage.decryptString(Buffer.from(blob.value, 'base64'))
    }
    return blob.value
  }

  setApiToken(token: string): void {
    const enc = this.encrypt(token)
    this.state.auth = {
      mode: 'api_token',
      secret: enc.value,
      encrypted: enc.encrypted
    }
    this.save()
  }

  setOAuthTokens(tokens: OAuthTokens): void {
    const enc = this.encrypt(tokens.accessToken)
    this.state.auth = {
      mode: 'oauth',
      secret: enc.value,
      encrypted: enc.encrypted,
      oauth: {
        refreshToken: tokens.refreshToken
          ? this.encrypt(tokens.refreshToken).value
          : undefined,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType
      }
    }
    // Mark refresh token encryption flag via encoding in secret path only;
    // refresh is stored encrypted when possible by reusing encrypt result.
    if (tokens.refreshToken && safeStorage.isEncryptionAvailable()) {
      const refreshEnc = this.encrypt(tokens.refreshToken)
      this.state.auth.oauth!.refreshToken = refreshEnc.value
    }
    this.save()
  }

  clearAuth(): void {
    this.state.auth = { mode: null, encrypted: false }
    this.save()
  }

  getAuthMode(): 'oauth' | 'api_token' | null {
    return this.state.auth.mode
  }

  getAccessToken(): string | null {
    if (!this.state.auth.mode || !this.state.auth.secret) return null
    try {
      return this.decrypt({
        encrypted: this.state.auth.encrypted,
        value: this.state.auth.secret
      })
    } catch {
      return null
    }
  }

  getRefreshToken(): string | null {
    const raw = this.state.auth.oauth?.refreshToken
    if (!raw) return null
    try {
      return this.decrypt({
        encrypted: this.state.auth.encrypted,
        value: raw
      })
    } catch {
      return null
    }
  }

  getTokenExpiresAt(): number | undefined {
    return this.state.auth.oauth?.expiresAt
  }

  getTunnelPrefs(tunnelId: string): TunnelLocalPrefs | undefined {
    return this.state.tunnelPrefs[tunnelId]
  }

  getAllTunnelPrefs(): Record<string, TunnelLocalPrefs> {
    return { ...this.state.tunnelPrefs }
  }

  setTunnelPrefs(prefs: TunnelLocalPrefs): void {
    this.state.tunnelPrefs[prefs.tunnelId] = prefs
    this.save()
  }

  removeTunnelPrefs(tunnelId: string): void {
    delete this.state.tunnelPrefs[tunnelId]
    delete this.state.tunnelTokens[tunnelId]
    this.save()
  }

  setTunnelToken(tunnelId: string, token: string): void {
    this.state.tunnelTokens[tunnelId] = this.encrypt(token)
    this.save()
  }

  getTunnelToken(tunnelId: string): string | null {
    const blob = this.state.tunnelTokens[tunnelId]
    if (!blob) return null
    try {
      return this.decrypt(blob)
    } catch {
      return null
    }
  }
}
