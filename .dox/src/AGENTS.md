# Purpose
Application TypeScript source (`main`, `preload`, `renderer`, `shared`).

# Ownership
All runtime app code except build scripts and packaged resources.

# Local Contracts
- Shared types only in `src/shared`
- No Node/Electron imports in renderer

# Verification
`bun run typecheck`, `bun test`

# Child DOX Index
| Scope | Doc |
|---|---|
| `src/main/` | `.dox/src/main/AGENTS.md` |
| `src/preload/` | `.dox/src/preload/AGENTS.md` |
| `src/renderer/` | `.dox/src/renderer/AGENTS.md` |
| `src/shared/` | `.dox/src/shared/AGENTS.md` |
