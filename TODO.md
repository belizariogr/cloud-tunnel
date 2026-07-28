# TODO

## Done

- [x] Scaffold Electron + Vite + React + TypeScript with Bun
- [x] Main process: store, tray, window, IPC, AppService
- [x] Cloudflare OAuth PKCE + API token fallback + tunnel/DNS APIs
- [x] Bundled cloudflared process manager + fetch script
- [x] React UI: Login, Home (sync + takeover), Tunnel form, Settings
- [x] DOX rail: AGENTS.md, docs/PLANEJAMENTO.md, .dox indexes
- [x] Unit tests for ingress parsing and platform keys
- [x] One-click Sign in; Client ID is publisher-only (`bun run setup:oauth`)
- [x] `bun run fetch:cloudflared`, `bun test`, `bun run typecheck`, `bun run pack`
- [x] GitHub Actions: CI on PRs + multi-platform Release on push to `main`

## Next

- [ ] Run `bun run setup:oauth` with a real Cloudflare OAuth client
- [ ] Add repo secret `CLOUD_TUNNEL_OAUTH_CLIENT_ID` so CI embeds Sign in
- [ ] Optional: macOS / Windows code-signing secrets for signed installers
- [ ] Generate proper multi-size app icons (ico/icns) for packaging
- [ ] End-to-end test against a real Cloudflare account
- [ ] Optional: launch at login
- [ ] Optional: TCP tunnel origins
