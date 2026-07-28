# Purpose
GitHub Actions workflows for CI checks and multi-platform releases.

# Ownership
- `.github/workflows/ci.yml` — PR checks (`typecheck` + `bun test`)
- `.github/workflows/release.yml` — push to `main` → build + GitHub Release

# Local Contracts
- Package manager is **Bun** (`oven-sh/setup-bun`); no npm lockfiles.
- CI uses `bun-version: latest` (stable). Commit `bun.lock` generated with **stable** Bun — canary writes `lockfileVersion: 2`, which stable rejects.
- After `bun install` on canary, regenerate with stable before commit: `bun upgrade --stable` temporarily, or install stable separately and re-run `bun install`.
- Releases use version `{package.json}-main.{run_number}` (e.g. `0.1.0-main.12`).
- Matrix jobs build with `--publish never`; `publish` job creates one GitHub Release and attaches all artifacts.
- OAuth Client ID comes from secret `CLOUD_TUNNEL_OAUTH_CLIENT_ID` (optional; embeds at build).
- Code signing secrets are optional; without them builds are unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`).

# Work Guidance
- Keep workflows English.
- Prefer `bun install --frozen-lockfile`.
- electron-builder output dir is `release/` (see `electron-builder.yml`).
- Do not commit secrets; document required secrets in README only.

# Verification
- Open a PR → `CI` workflow must pass.
- Merge/push to `main` → `Release` creates tag `v…` and attaches mac/win/linux artifacts.

# Child DOX Index
| Scope | Doc |
|---|---|
| `workflows/` | [`.dox/.github/workflows/AGENTS.md`](workflows/AGENTS.md) |
