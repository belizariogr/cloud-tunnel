import type { CloudTunnelApi } from './index'

declare global {
  interface Window {
    cloudTunnel: CloudTunnelApi
  }
}

export {}
