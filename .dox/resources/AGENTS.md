# Purpose
Packaged assets: tray/app icons and per-platform cloudflared binaries.

# Local Contracts
- Binaries under `resources/cloudflared/<platform>-<arch>/`
- Do not commit large binaries if policy prefers fetch-on-build; script recreates them
