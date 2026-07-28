# Purpose
Individual workflow files for CI and release publishing.

# Local Contracts
- `ci.yml` — `pull_request` → `main` only; no publish.
- `release.yml` — `push` → `main`; quality gate → matrix build (mac/win/linux) → single `gh release create`.

# Work Guidance
- When changing artifact globs, keep them aligned with `electron-builder.yml` targets.
- Matrix jobs must share the same `package.json` version as the release tag (`v{version}`).
- Prefer `--publish never` + `gh release create` over electron-builder publish (avoids multi-job races).

# Verification
- YAML must remain valid GitHub Actions workflow syntax.
