import type {
  AccountInfo,
  AuthState,
  CreateTunnelInput,
  TunnelLocalPrefs,
  TunnelRuntimeStatus,
  TunnelView,
  UpdateTunnelInput,
  ZoneInfo
} from '@shared/types'
import { loginWithOAuth, refreshOAuthToken } from './auth/oauth'
import { isOAuthConfigured, resolveOAuthClientConfig } from './auth/client-id'
import * as cf from './cloudflare/api'
import { Store } from './store'
import { TunnelProcessManager } from './tunnel/manager'
import { getBundledCloudflaredVersion } from './tunnel/binary'

export class AppService {
  readonly store: Store
  readonly processes: TunnelProcessManager
  private accountsCache: AccountInfo[] = []
  private tunnelsCache: TunnelView[] = []
  private onTunnelsChanged?: (tunnels: TunnelView[]) => void
  private onAuthChanged?: (auth: AuthState) => void

  constructor() {
    this.store = new Store()
    this.processes = new TunnelProcessManager()
    // Local process changes must not re-hit Cloudflare (was freezing the UI).
    this.processes.on('status', () => {
      this.emitLocalStatusChanged()
    })
  }

  setListeners(handlers: {
    onTunnelsChanged: (tunnels: TunnelView[]) => void
    onAuthChanged: (auth: AuthState) => void
  }): void {
    this.onTunnelsChanged = handlers.onTunnelsChanged
    this.onAuthChanged = handlers.onAuthChanged
  }

  private withLocalStatus(view: TunnelView): TunnelView {
    const processStatus = this.processes.getStatus(view.tunnelId)
    const localRunning = this.processes.isRunning(view.tunnelId)
    let status: TunnelRuntimeStatus = 'inactive'
    if (processStatus === 'starting') status = 'starting'
    else if (processStatus === 'error') status = 'error'
    else if (localRunning) status = 'active_local'
    else if (view.hasRemoteConnections || view.connectionsCount > 0) {
      status = 'active_remote'
    }

    return {
      ...view,
      status,
      errorMessage: this.processes.getError(view.tunnelId),
      hasRemoteConnections:
        !localRunning &&
        (view.hasRemoteConnections || view.connectionsCount > 0)
    }
  }

  private emitLocalStatusChanged(): void {
    if (!this.onTunnelsChanged || this.tunnelsCache.length === 0) return
    this.tunnelsCache = this.tunnelsCache.map((t) => this.withLocalStatus(t))
    this.onTunnelsChanged(this.tunnelsCache)
  }

  private async emitTunnelsChanged(): Promise<TunnelView[]> {
    try {
      const tunnels = await this.listTunnels()
      this.onTunnelsChanged?.(tunnels)
      return tunnels
    } catch {
      return this.tunnelsCache
    }
  }

  private emitAuthChanged(): void {
    this.onAuthChanged?.(this.getAuthState())
  }

  getAuthState(): AuthState {
    const mode = this.store.getAuthMode()
    return {
      authenticated: Boolean(mode && this.store.getAccessToken()),
      mode,
      accountId: this.store.getSettings().accountId,
      accounts: this.accountsCache,
      oauthConfigured: isOAuthConfigured()
    }
  }

  private oauthClientId(): string {
    return resolveOAuthClientConfig().clientId
  }

  async ensureAccessToken(): Promise<string> {
    const mode = this.store.getAuthMode()
    let token = this.store.getAccessToken()
    if (!token) throw new Error('Not authenticated')

    if (mode === 'oauth') {
      const expiresAt = this.store.getTokenExpiresAt()
      const refresh = this.store.getRefreshToken()
      if (refresh && expiresAt && Date.now() > expiresAt - 60_000) {
        const clientId = this.oauthClientId()
        const refreshed = await refreshOAuthToken(clientId, refresh)
        this.store.setOAuthTokens(refreshed)
        token = refreshed.accessToken
      }
    }
    return token
  }

  async loginOAuth(): Promise<AuthState> {
    const { clientId, scopes } = resolveOAuthClientConfig()
    if (!clientId) {
      throw new Error(
        'This build is not linked to Cloudflare yet. The app publisher must run once: bun run setup:oauth'
      )
    }
    const tokens = await loginWithOAuth(clientId, scopes)
    this.store.setOAuthTokens(tokens)
    await this.refreshAccounts()
    this.emitAuthChanged()
    return this.getAuthState()
  }

  async loginApiToken(apiToken: string): Promise<AuthState> {
    if (!apiToken.trim()) throw new Error('API token is required')
    this.store.setApiToken(apiToken.trim())
    await this.refreshAccounts()
    this.emitAuthChanged()
    return this.getAuthState()
  }

  logout(): void {
    void this.processes.stopAll()
    this.store.clearAuth()
    this.accountsCache = []
    this.tunnelsCache = []
    this.emitAuthChanged()
  }

  async refreshAccounts(): Promise<AccountInfo[]> {
    const token = await this.ensureAccessToken()
    this.accountsCache = await cf.listAccounts(token)
    const settings = this.store.getSettings()
    if (
      !settings.accountId ||
      !this.accountsCache.some((a) => a.id === settings.accountId)
    ) {
      const first = this.accountsCache[0]
      if (first) {
        this.store.updateSettings({ accountId: first.id })
      } else {
        this.store.updateSettings({ accountId: null })
      }
    }
    this.emitAuthChanged()
    return this.accountsCache
  }

  async selectAccount(accountId: string): Promise<void> {
    this.store.updateSettings({ accountId })
    this.emitAuthChanged()
    await this.emitTunnelsChanged()
  }

  /**
   * Ensure settings.accountId is set. Refreshes account list from Cloudflare when
   * missing (e.g. app restart after login).
   */
  async ensureAccountId(): Promise<string> {
    let id = this.store.getSettings().accountId
    if (id && this.accountsCache.some((a) => a.id === id)) {
      return id
    }

    const accounts = await this.refreshAccounts()
    id = this.store.getSettings().accountId
    if (id) return id

    if (accounts.length === 0) {
      throw new Error(
        'No Cloudflare accounts visible for this login. Your token/OAuth scopes may lack Account Read — use an API token with Account Settings Read, or add account.read to the OAuth client.'
      )
    }

    throw new Error('No Cloudflare account selected')
  }

  async listZones(): Promise<ZoneInfo[]> {
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()
    return cf.listZones(token, accountId)
  }

  private toView(
    tunnel: cf.CfTunnel,
    accountId: string,
    config: cf.CfTunnelConfig | null
  ): TunnelView {
    const parsed = cf.parseIngress(config ?? undefined)
    const prefs = this.store.getTunnelPrefs(tunnel.id)
    const localHost = prefs?.localHost ?? parsed.localHost
    const localPort = prefs?.localPort ?? parsed.localPort
    const protocol = prefs?.protocol ?? parsed.protocol

    const connections = tunnel.connections ?? []
    const hasRemoteConnections = connections.length > 0
    const localRunning = this.processes.isRunning(tunnel.id)
    const processStatus = this.processes.getStatus(tunnel.id)

    let status: TunnelRuntimeStatus = 'inactive'
    if (processStatus === 'starting') status = 'starting'
    else if (processStatus === 'error') status = 'error'
    else if (localRunning) status = 'active_local'
    else if (hasRemoteConnections) status = 'active_remote'

    return {
      tunnelId: tunnel.id,
      name: tunnel.name,
      accountId,
      publicHostname: parsed.hostname,
      localHost,
      localPort,
      protocol,
      status,
      errorMessage: this.processes.getError(tunnel.id),
      hasRemoteConnections: hasRemoteConnections && !localRunning,
      connectionsCount: connections.length,
      restoreOnLaunch: prefs?.restoreOnLaunch ?? false
    }
  }

  async listTunnels(): Promise<TunnelView[]> {
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()
    const tunnels = await cf.listTunnels(token, accountId)

    const views = await Promise.all(
      tunnels.map(async (tunnel) => {
        let config: cf.CfTunnelConfig | null = null
        try {
          config = await cf.getTunnelConfiguration(token, accountId, tunnel.id)
        } catch {
          config = null
        }
        return this.toView(tunnel, accountId, config)
      })
    )

    views.sort((a, b) => a.name.localeCompare(b.name))
    this.tunnelsCache = views
    return views
  }

  async createTunnel(input: CreateTunnelInput): Promise<TunnelView> {
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()
    const created = await cf.createTunnel(token, accountId, input.name)
    const service = cf.buildServiceUrl(
      input.protocol,
      input.localHost,
      input.localPort
    )
    await cf.putTunnelConfiguration(
      token,
      accountId,
      created.id,
      input.hostname,
      service
    )

    const existing = await cf.findDnsRecordByName(
      token,
      input.zoneId,
      input.hostname
    )
    if (existing) {
      await cf.updateDnsCname(
        token,
        input.zoneId,
        existing.id,
        input.hostname,
        created.id
      )
    } else {
      await cf.createDnsCname(token, input.zoneId, input.hostname, created.id)
    }

    const tunnelToken = await cf.getTunnelToken(token, accountId, created.id)
    this.store.setTunnelToken(created.id, tunnelToken)
    this.store.setTunnelPrefs({
      tunnelId: created.id,
      localHost: input.localHost,
      localPort: input.localPort,
      protocol: input.protocol
    })

    const config = await cf.getTunnelConfiguration(token, accountId, created.id)
    const view = this.toView(created, accountId, config)
    view.zoneId = input.zoneId
    await this.emitTunnelsChanged()
    return view
  }

  async updateTunnel(input: UpdateTunnelInput): Promise<TunnelView> {
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()
    const prefs: TunnelLocalPrefs = {
      tunnelId: input.tunnelId,
      localHost: input.localHost,
      localPort: input.localPort,
      protocol: input.protocol,
      restoreOnLaunch: this.store.getTunnelPrefs(input.tunnelId)?.restoreOnLaunch
    }
    this.store.setTunnelPrefs(prefs)

    if (input.hostname) {
      const service = cf.buildServiceUrl(
        input.protocol,
        input.localHost,
        input.localPort
      )
      await cf.putTunnelConfiguration(
        token,
        accountId,
        input.tunnelId,
        input.hostname,
        service
      )

      if (input.zoneId) {
        const existing = await cf.findDnsRecordByName(
          token,
          input.zoneId,
          input.hostname
        )
        if (existing) {
          await cf.updateDnsCname(
            token,
            input.zoneId,
            existing.id,
            input.hostname,
            input.tunnelId
          )
        } else {
          await cf.createDnsCname(
            token,
            input.zoneId,
            input.hostname,
            input.tunnelId
          )
        }
      }
    } else {
      // Update ingress service using existing hostname if present
      const config = await cf.getTunnelConfiguration(
        token,
        accountId,
        input.tunnelId
      )
      const parsed = cf.parseIngress(config)
      if (parsed.hostname) {
        const service = cf.buildServiceUrl(
          input.protocol,
          input.localHost,
          input.localPort
        )
        await cf.putTunnelConfiguration(
          token,
          accountId,
          input.tunnelId,
          parsed.hostname,
          service
        )
      }
    }

    const tunnels = await this.emitTunnelsChanged()
    const view = tunnels.find((t) => t.tunnelId === input.tunnelId)
    if (!view) throw new Error('Tunnel not found after update')
    return view
  }

  async deleteTunnel(tunnelId: string): Promise<void> {
    await this.processes.stop(tunnelId)
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()

    try {
      const config = await cf.getTunnelConfiguration(token, accountId, tunnelId)
      const hostname = cf.parseIngress(config).hostname
      if (hostname) {
        const zones = await cf.listZones(token, accountId)
        for (const zone of zones) {
          if (!hostname.endsWith(zone.name)) continue
          const record = await cf.findDnsRecordByName(token, zone.id, hostname)
          if (record) {
            await cf.deleteDnsRecord(token, zone.id, record.id)
          }
        }
      }
    } catch {
      // continue deleting tunnel even if DNS cleanup fails
    }

    await cf.deleteTunnel(token, accountId, tunnelId)
    this.store.removeTunnelPrefs(tunnelId)
    await this.emitTunnelsChanged()
  }

  async activateTunnel(tunnelId: string, takeover: boolean): Promise<TunnelView> {
    const token = await this.ensureAccessToken()
    const accountId = await this.ensureAccountId()
    const remote = await cf.getTunnel(token, accountId, tunnelId)
    const hasRemote = (remote.connections?.length ?? 0) > 0
    const localRunning = this.processes.isRunning(tunnelId)

    if (hasRemote && !localRunning && !takeover) {
      throw new Error('TAKEOVER_REQUIRED')
    }

    if (hasRemote && takeover) {
      await cf.deleteTunnelConnections(token, accountId, tunnelId)
    }

    let tunnelToken = this.store.getTunnelToken(tunnelId)
    if (!tunnelToken) {
      tunnelToken = await cf.getTunnelToken(token, accountId, tunnelId)
      this.store.setTunnelToken(tunnelId, tunnelToken)
    }

    const prefs = this.store.getTunnelPrefs(tunnelId)
    this.store.setTunnelPrefs({
      tunnelId,
      localHost: prefs?.localHost ?? 'localhost',
      localPort: prefs?.localPort ?? 8080,
      protocol: prefs?.protocol ?? 'http',
      restoreOnLaunch: true
    })

    await this.processes.start(tunnelId, tunnelToken)
    const tunnels = await this.emitTunnelsChanged()
    const view = tunnels.find((t) => t.tunnelId === tunnelId)
    if (!view) throw new Error('Tunnel not found')
    return view
  }

  async deactivateTunnel(tunnelId: string): Promise<TunnelView> {
    await this.processes.stop(tunnelId)
    const prefs = this.store.getTunnelPrefs(tunnelId)
    if (prefs) {
      this.store.setTunnelPrefs({ ...prefs, restoreOnLaunch: false })
    }
    const tunnels = await this.emitTunnelsChanged()
    const view = tunnels.find((t) => t.tunnelId === tunnelId)
    if (!view) {
      return {
        tunnelId,
        name: tunnelId,
        accountId: (await this.ensureAccountId().catch(() => 'unknown')) as string,
        localHost: 'localhost',
        localPort: 8080,
        protocol: 'http',
        status: 'inactive',
        hasRemoteConnections: false,
        connectionsCount: 0,
        restoreOnLaunch: false
      }
    }
    return view
  }

  async restoreOnLaunch(): Promise<void> {
    if (!this.store.getSettings().restoreActiveOnLaunch) return
    if (!this.store.getAccessToken()) return

    const prefs = this.store.getAllTunnelPrefs()
    const toRestore = Object.values(prefs).filter((p) => p.restoreOnLaunch)
    for (const pref of toRestore) {
      try {
        await this.activateTunnel(pref.tunnelId, true)
      } catch (err) {
        console.error('Failed to restore tunnel', pref.tunnelId, err)
      }
    }
  }

  cloudflaredVersion(): string {
    return getBundledCloudflaredVersion()
  }
}
