# Cloud Tunnel — Planning

## Vision

Cloud Tunnel is a cross-platform desktop app that lets you manage Cloudflare
named tunnels and **activate them only when you want**. The system tray shows
whether a local connector is active. Cloudflare remains the source of truth for
the tunnel catalog.

## Architecture

- **Electron main**: OAuth/API token auth, Cloudflare REST, `cloudflared` process
  manager, tray, secure store
- **Preload**: typed `window.cloudTunnel` bridge
- **Renderer**: React UI (Login, Home, Tunnel form, Settings) — English
- **Bundled cloudflared**: fetched at build/dev via `bun run fetch:cloudflared`,
  shipped in `extraResources`

## Auth

- Preferred: Cloudflare OAuth Authorization Code + PKCE (public client)
- Fallback: API token pasted in the UI
- Tokens encrypted with Electron `safeStorage` when available

## Tunnel sync and takeover

1. After login, list tunnels from `GET /accounts/{id}/cfd_tunnel`
2. Merge local origin prefs (host/port/protocol) by tunnel id
3. Status: inactive / active here / active elsewhere / starting / error
4. Activate with remote connectors → confirm takeover →
   `DELETE .../connections` → spawn local `cloudflared tunnel run --token`

## Scope (current)

- Remotely managed named tunnels (`config_src: cloudflare`)
- HTTP(S) local origins
- DNS CNAME for public hostnames on user zones
- No quick tunnels (`trycloudflare.com`) in v1
