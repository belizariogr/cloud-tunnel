# Purpose
Electron main process: window, tray, auth, Cloudflare API, tunnel processes, IPC.

# Ownership
`src/main/**`

# Local Contracts
- Privileged operations only here
- `AppService` orchestrates auth + tunnels
- Spawn only bundled cloudflared

# Verification
`bun test` (pure helpers), manual smoke with `bun run dev`

# Child DOX Index
| Scope | Doc |
|---|---|
| `index.ts` | `.dox/src/main/index.ts.dox` |
| `ipc.ts` | `.dox/src/main/ipc.ts.dox` |
| `service.ts` | `.dox/src/main/service.ts.dox` |
| `store.ts` | `.dox/src/main/store.ts.dox` |
| `auth/` | `.dox/src/main/auth/AGENTS.md` |
| `cloudflare/` | `.dox/src/main/cloudflare/AGENTS.md` |
| `tunnel/` | `.dox/src/main/tunnel/AGENTS.md` |
