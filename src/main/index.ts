import {
  app,
  BrowserWindow,
  Menu,
  nativeImage,
  Tray,
  shell
} from 'electron'
import { join } from 'node:path'
import { AppService } from './service'
import { registerIpc } from './ipc'
import type { TunnelView } from '@shared/types'

// Wayland + AMD often breaks Chromium GL (VSync spam + frozen UI).
// Disable GPU before ready so the window stays responsive.
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let service: AppService | null = null
let isQuitting = false
let trayIconActive: Electron.NativeImage | null = null
let trayIconInactive: Electron.NativeImage | null = null
let lastTrayActive: boolean | null = null

function resolveIcon(name: string): Electron.NativeImage {
  const candidates = [
    join(__dirname, '../../resources/icons', name),
    join(app.getAppPath(), 'resources/icons', name),
    join(process.resourcesPath, 'icons', name)
  ]
  for (const path of candidates) {
    const img = nativeImage.createFromPath(path)
    if (!img.isEmpty()) return img
  }
  return nativeImage.createEmpty()
}

function resolveTrayIcon(active: boolean): Electron.NativeImage {
  if (active && trayIconActive) return trayIconActive
  if (!active && trayIconInactive) return trayIconInactive

  const base = active ? 'tray-active' : 'tray-inactive'
  const hi = resolveIcon(`${base}@2x.png`)
  const img = hi.isEmpty() ? resolveIcon(`${base}.png`) : hi
  const sized = img.isEmpty() ? img : img.resize({ width: 22, height: 22 })
  if (active) trayIconActive = sized
  else trayIconInactive = sized
  return sized
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Cloud Tunnel',
    backgroundColor: '#F7F5F2',
    icon: resolveIcon('icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function updateTrayMenu(tunnels: TunnelView[]): void {
  if (!tray || !service) return

  const anyLocal = tunnels.some((t) => t.status === 'active_local')
  tray.setToolTip(
    anyLocal ? 'Cloud Tunnel — Active' : 'Cloud Tunnel — Inactive'
  )

  const tunnelItems: Electron.MenuItemConstructorOptions[] = tunnels.map(
    (t) => ({
      label: `${t.status === 'active_local' ? '●' : '○'} ${t.name}`,
      click: () => {
        if (t.status === 'active_local') {
          void service!.deactivateTunnel(t.tunnelId)
        } else {
          void service!.activateTunnel(t.tunnelId, true).catch((err) => {
            console.error(err)
          })
        }
      }
    })
  )

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Cloud Tunnel',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    ...(tunnelItems.length
      ? tunnelItems
      : [{ label: 'No tunnels', enabled: false }]),
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
}

function createTray(): void {
  tray = new Tray(resolveTrayIcon(false))
  updateTrayMenu([])
}

app.whenReady().then(async () => {
  service = new AppService()
  registerIpc(service)

  service.setListeners({
    onTunnelsChanged: (tunnels) => {
      updateTrayMenu(tunnels)
      const anyLocal = tunnels.some(
        (t) => t.status === 'active_local' || t.status === 'starting'
      )
      if (tray && lastTrayActive !== anyLocal) {
        lastTrayActive = anyLocal
        tray.setImage(resolveTrayIcon(anyLocal))
      }
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('tunnels:changed', tunnels)
      }
    },
    onAuthChanged: (auth) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('auth:changed', auth)
      }
    }
  })

  createWindow()
  createTray()

  if (service.getAuthState().authenticated) {
    try {
      await service.refreshAccounts()
      await service.restoreOnLaunch()
      const tunnels = await service.listTunnels()
      updateTrayMenu(tunnels)
    } catch (err) {
      console.error('Startup sync failed', err)
    }
  }
})

app.on('before-quit', () => {
  isQuitting = true
  void service?.processes.stopAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray; do not quit
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    mainWindow?.show()
  }
})
