import { ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'
import { AppService } from './service'
import { app } from 'electron'

export function registerIpc(service: AppService): void {
  ipcMain.handle('auth:getState', () => service.getAuthState())
  ipcMain.handle('auth:loginOAuth', () => service.loginOAuth())
  ipcMain.handle('auth:loginApiToken', (_e, token: string) =>
    service.loginApiToken(token)
  )
  ipcMain.handle('auth:logout', () => {
    service.logout()
  })

  ipcMain.handle('settings:get', () => service.store.getSettings())
  ipcMain.handle('settings:set', (_e, partial: Partial<AppSettings>) =>
    service.store.updateSettings(partial)
  )

  ipcMain.handle('accounts:list', () => service.refreshAccounts())
  ipcMain.handle('accounts:select', (_e, accountId: string) =>
    service.selectAccount(accountId)
  )
  ipcMain.handle('zones:list', () => service.listZones())

  ipcMain.handle('tunnels:list', () => service.listTunnels())
  ipcMain.handle('tunnels:refresh', () => service.listTunnels())
  ipcMain.handle('tunnels:create', (_e, input) => service.createTunnel(input))
  ipcMain.handle('tunnels:update', (_e, input) => service.updateTunnel(input))
  ipcMain.handle('tunnels:delete', (_e, tunnelId: string) =>
    service.deleteTunnel(tunnelId)
  )
  ipcMain.handle(
    'tunnels:activate',
    (_e, tunnelId: string, takeover: boolean) =>
      service.activateTunnel(tunnelId, takeover)
  )
  ipcMain.handle('tunnels:deactivate', (_e, tunnelId: string) =>
    service.deactivateTunnel(tunnelId)
  )

  ipcMain.handle('cloudflared:version', () => service.cloudflaredVersion())
  ipcMain.handle('app:getVersion', () => app.getVersion())
}
