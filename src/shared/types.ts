export type TunnelProtocol = 'http' | 'https'

export type TunnelRuntimeStatus =
  | 'inactive'
  | 'active_local'
  | 'active_remote'
  | 'starting'
  | 'error'

export interface TunnelLocalPrefs {
  tunnelId: string
  localHost: string
  localPort: number
  protocol: TunnelProtocol
  /** Prefer activating this tunnel when the app starts */
  restoreOnLaunch?: boolean
}

export interface TunnelView {
  tunnelId: string
  name: string
  accountId: string
  zoneId?: string
  publicHostname?: string
  localHost: string
  localPort: number
  protocol: TunnelProtocol
  status: TunnelRuntimeStatus
  errorMessage?: string
  hasRemoteConnections: boolean
  connectionsCount: number
  restoreOnLaunch: boolean
}

export interface ZoneInfo {
  id: string
  name: string
}

export interface AccountInfo {
  id: string
  name: string
}

export interface AuthState {
  authenticated: boolean
  mode: 'oauth' | 'api_token' | null
  accountId: string | null
  accounts: AccountInfo[]
  /** True when the publisher baked in an OAuth Client ID (end users never set this). */
  oauthConfigured: boolean
}

export interface AppSettings {
  accountId: string | null
  restoreActiveOnLaunch: boolean
}

export interface CreateTunnelInput {
  name: string
  zoneId: string
  hostname: string
  localHost: string
  localPort: number
  protocol: TunnelProtocol
}

export interface UpdateTunnelInput {
  tunnelId: string
  name?: string
  zoneId?: string
  hostname?: string
  localHost: string
  localPort: number
  protocol: TunnelProtocol
}

export type IpcChannels = {
  'auth:getState': { args: []; result: AuthState }
  'auth:loginOAuth': { args: []; result: AuthState }
  'auth:loginApiToken': { args: [token: string]; result: AuthState }
  'auth:logout': { args: []; result: void }
  'settings:get': { args: []; result: AppSettings }
  'settings:set': { args: [partial: Partial<AppSettings>]; result: AppSettings }
  'accounts:list': { args: []; result: AccountInfo[] }
  'accounts:select': { args: [accountId: string]; result: void }
  'zones:list': { args: []; result: ZoneInfo[] }
  'tunnels:list': { args: []; result: TunnelView[] }
  'tunnels:refresh': { args: []; result: TunnelView[] }
  'tunnels:create': { args: [input: CreateTunnelInput]; result: TunnelView }
  'tunnels:update': { args: [input: UpdateTunnelInput]; result: TunnelView }
  'tunnels:delete': { args: [tunnelId: string]; result: void }
  'tunnels:activate': {
    args: [tunnelId: string, takeover: boolean]
    result: TunnelView
  }
  'tunnels:deactivate': { args: [tunnelId: string]; result: TunnelView }
  'cloudflared:version': { args: []; result: string }
  'app:getVersion': { args: []; result: string }
}

export type IpcEventChannels = {
  'tunnels:changed': TunnelView[]
  'auth:changed': AuthState
}
