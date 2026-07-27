import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  AuthState,
  CreateTunnelInput,
  TunnelView,
  UpdateTunnelInput,
  ZoneInfo,
  AccountInfo
} from '../shared/types'

const api = {
  getAuthState: (): Promise<AuthState> => ipcRenderer.invoke('auth:getState'),
  loginOAuth: (): Promise<AuthState> => ipcRenderer.invoke('auth:loginOAuth'),
  loginApiToken: (token: string): Promise<AuthState> =>
    ipcRenderer.invoke('auth:loginApiToken', token),
  logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),

  listAccounts: (): Promise<AccountInfo[]> => ipcRenderer.invoke('accounts:list'),
  selectAccount: (accountId: string): Promise<void> =>
    ipcRenderer.invoke('accounts:select', accountId),
  listZones: (): Promise<ZoneInfo[]> => ipcRenderer.invoke('zones:list'),

  listTunnels: (): Promise<TunnelView[]> => ipcRenderer.invoke('tunnels:list'),
  refreshTunnels: (): Promise<TunnelView[]> =>
    ipcRenderer.invoke('tunnels:refresh'),
  createTunnel: (input: CreateTunnelInput): Promise<TunnelView> =>
    ipcRenderer.invoke('tunnels:create', input),
  updateTunnel: (input: UpdateTunnelInput): Promise<TunnelView> =>
    ipcRenderer.invoke('tunnels:update', input),
  deleteTunnel: (tunnelId: string): Promise<void> =>
    ipcRenderer.invoke('tunnels:delete', tunnelId),
  activateTunnel: (tunnelId: string, takeover: boolean): Promise<TunnelView> =>
    ipcRenderer.invoke('tunnels:activate', tunnelId, takeover),
  deactivateTunnel: (tunnelId: string): Promise<TunnelView> =>
    ipcRenderer.invoke('tunnels:deactivate', tunnelId),

  cloudflaredVersion: (): Promise<string> =>
    ipcRenderer.invoke('cloudflared:version'),
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  onTunnelsChanged: (cb: (tunnels: TunnelView[]) => void): (() => void) => {
    const listener = (_: unknown, tunnels: TunnelView[]): void => cb(tunnels)
    ipcRenderer.on('tunnels:changed', listener)
    return () => ipcRenderer.removeListener('tunnels:changed', listener)
  },
  onAuthChanged: (cb: (auth: AuthState) => void): (() => void) => {
    const listener = (_: unknown, auth: AuthState): void => cb(auth)
    ipcRenderer.on('auth:changed', listener)
    return () => ipcRenderer.removeListener('auth:changed', listener)
  }
}

contextBridge.exposeInMainWorld('cloudTunnel', api)

export type CloudTunnelApi = typeof api
