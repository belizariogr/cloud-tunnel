# AGENTS.md — Rules for AI agents (and humans)

This file guides any AI agent working on **Cloud Tunnel**. Read it in full
**before writing or modifying code**. In case of conflict, these rules take
precedence. See also [`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md) (vision and
architecture) and [`TODO.md`](TODO.md) (current state).

## Non-negotiable rules

1. **Always follow these rules.** Re-read this file at the start of each work
   session and keep it in mind for every decision.
2. **Electron + React + TypeScript** desktop app. Do not introduce another UI
   or desktop framework. Use **Bun** for package management, scripts, and tests
   (`bun install`, `bun run`, `bun test`). Do not add npm/yarn lockfiles.
3. **Best practices and reuse.** Prefer existing modules and patterns. Extract
   abstractions when there is repetition — without speculative layers.
4. **Write tests for every meaningful function/action.** Run `bun test` and
   `bun run typecheck` before considering a task done.
5. **Cross-platform (Windows, Linux, macOS).** OS-specific code lives behind a
   portable API (e.g. `tunnel/platform.ts`, `tunnel/binary.ts`). Do not leak
   platform details into the React UI.
6. **Keep `TODO.md` up to date.** Mark work in progress and done; add discovered
   next steps. `TODO.md` is the source of truth for progress.
7. **Performance is a requirement.** Start fast; avoid heavy synchronous work at
   startup; sync tunnels after the window is ready.
8. **Beautiful, simple design.** English UI only. Use CSS theme tokens in
   `src/renderer/src/styles/global.css` — never loose hex colors in components.
9. **Fully bundled `cloudflared`.** Never require a system install. Resolve the
   binary via `getCloudflaredBinaryPath()`. Fetch with
   `bun run fetch:cloudflared`.
10. **No secrets in the repo.** Tokens live in Electron `safeStorage` / user
    Settings only.
11. **Cloudflare is the tunnel catalog.** Fresh machines list account tunnels
    after login. Activating a tunnel that is already connected remotely requires
    takeover confirmation, then `DELETE .../connections`.

## Expected workflow

1. Read `AGENTS.md`, `docs/PLANEJAMENTO.md`, and `TODO.md`.
2. Pick/update an item in `TODO.md` and mark it in progress.
3. Read the DOX chain for every path you will touch under `.dox/`.
4. Implement following existing patterns.
5. Write or update tests.
6. Run `bun test` and `bun run typecheck`.
7. Update `TODO.md` and DOX docs as required.
8. Make small, descriptive commits. **Do not** commit secrets/credentials.

## Code conventions

- **Tooling**: Bun + electron-vite + TypeScript strict.
- **Names**: English for identifiers, comments, and UI copy.
- **Comments**: explain *why*, not *what*.
- **Main vs renderer**: privileged work (OAuth, API, spawn) in `src/main` only;
  renderer talks via typed preload `window.cloudTunnel`.
- **IPC**: register handlers in `src/main/ipc.ts`; shared types in
  `src/shared/types.ts`.

## Repository structure

```
cloud-tunnel/
├── AGENTS.md
├── README.md
├── TODO.md
├── docs/PLANEJAMENTO.md
├── .dox/                 ← child DOX mirrors
├── scripts/              ← Bun build helpers (fetch cloudflared)
├── resources/            ← icons + bundled cloudflared binaries
└── src/
    ├── main/             ← Electron main process
    ├── preload/          ← contextBridge API
    ├── renderer/         ← React UI
    └── shared/           ← shared types
```

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## .dox Storage

Child docs live under `.dox/`, mirroring the scope they govern. Source trees stay
free of scattered AGENTS.md / `.dox` files beside code.

| Scope | Doc path |
|---|---|
| Repository root | `AGENTS.md` |
| Directory `src/main/` | `.dox/src/main/AGENTS.md` |
| Source file `src/main/store.ts` | `.dox/src/main/store.ts.dox` |

Rules:

- Only the root rail stays at `AGENTS.md`. Directory scopes use
  `.dox/<mirrored-path>/AGENTS.md`.
- **Every TypeScript/TSX source file** under `src/` has a matching per-file doc
  at `.dox/src/<mirrored-path>/<file>.<ext>.dox`. That file owns the module's
  Purpose and **API Catalog**.
- Never create `AGENTS.md` or `*.dox` beside source files — only under `.dox/`.
- When creating, moving, or deleting a source file, keep the `.dox/` mirror
  aligned.

Resolution: for `src/main/tunnel/manager.ts`, walk `.dox/src/…/AGENTS.md` then
read `.dox/src/main/tunnel/manager.ts.dox`.

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products must stay understandable from the nearest applicable AGENTS.md
  plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root `AGENTS.md`
2. Identify every file or folder you expect to touch; if its DOX mirror does not
   exist, create it (directory → `AGENTS.md`; source → `<file>.<ext>.dox`)
3. Walk from the repository root to each target path
4. Along each route, read every mirrored directory doc at
   `.dox/<path>/AGENTS.md`, then the per-file `.dox/.../<file>.<ext>.dox`
5. Use the nearest applicable doc as the local contract
6. If docs conflict, the closer doc controls local details, but no child may
   weaken DOX

## Update After Editing

Every meaningful change requires a DOX pass before the task is done. Update the
closest owning doc when purpose, contracts, workflows, or indexes change. Create
missing mirrors. Remove stale text.

## Hierarchy

- Root `AGENTS.md` is the DOX rail
- Directory children: `.dox/<mirrored-path>/AGENTS.md`
- Per-file contracts: `.dox/src/.../<file>.<ext>.dox` with **API Catalog**

## Child Doc Shape

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index
- API Catalog _(required on each per-file `.dox`)_

## Style

- Concise, current, operational
- Stable contracts, not diary entries
- Prefer direct bullets with explicit names

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and Child DOX Indexes
3. Remove stale or orphaned `.dox/` mirrors
4. Run `bun test` / `bun run typecheck` when relevant

## User Preferences

- **Per-file source contracts:** every `src/**/*.{ts,tsx}` file has a matching
  `.dox/src/.../<file>.<ext>.dox` with an `## API Catalog` for exported
  functions/methods.
- **Bun** is the only package manager / script runner for this repo.
- **English** UI and codebase language.

## Child DOX Index

| Scope | Doc | Owns |
|---|---|---|
| `src/` | [`.dox/src/AGENTS.md`](.dox/src/AGENTS.md) | Application source layout |
| `src/main/` | [`.dox/src/main/AGENTS.md`](.dox/src/main/AGENTS.md) | Electron main, auth, Cloudflare, tunnels |
| `src/preload/` | [`.dox/src/preload/AGENTS.md`](.dox/src/preload/AGENTS.md) | contextBridge API |
| `src/renderer/` | [`.dox/src/renderer/AGENTS.md`](.dox/src/renderer/AGENTS.md) | React UI |
| `src/shared/` | [`.dox/src/shared/AGENTS.md`](.dox/src/shared/AGENTS.md) | Shared types |
| `scripts/` | [`.dox/scripts/AGENTS.md`](.dox/scripts/AGENTS.md) | Build/fetch scripts |
| `resources/` | [`.dox/resources/AGENTS.md`](.dox/resources/AGENTS.md) | Icons and cloudflared binaries |
| `docs/` | [`.dox/docs/AGENTS.md`](.dox/docs/AGENTS.md) | Planning docs |
