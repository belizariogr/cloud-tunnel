# Cloud Tunnel

Desktop app to manage Cloudflare tunnels and activate them on demand.
Works on Windows, Linux, and macOS. Fully self-contained — **no system
`cloudflared` or Node install required** to run the packaged app.

## For end users

1. Install / open Cloud Tunnel  
2. Click **Sign in with Cloudflare**  
3. Log in in the browser and approve access  
4. Your tunnels appear — activate when you need them  

No Client ID. No API token. Just your Cloudflare account.

## For you (app publisher) — once

Cloudflare requires every third-party app to register an **OAuth client**.
That is **not** something each user creates. You create it **once**, the Client
ID is embedded in the app, and users only see the Sign in button.

```bash
bun install
bun run setup:oauth
```

The script opens the Cloudflare dashboard. Create an OAuth client with:

| Field | Value |
|-------|--------|
| Grant | Authorization Code |
| Token auth | `none` (PKCE) |
| Redirect URL | `http://127.0.0.1:53682/callback` |
| Scopes | Account Settings Read; Tunnel/Connectors Edit; Zone Read; DNS Edit |

Paste the **Client ID** when prompted. It is saved to
`resources/oauth-client.json` (gitignored) and baked into `bun run dev` /
`bun run dist`.

- **Private** client → only members of your Cloudflare account can sign in  
- **Public** client → any Cloudflare user (needs domain verification)

See [`docs/PUBLISHER-OAUTH.md`](docs/PUBLISHER-OAUTH.md).

## Develop

```bash
bun install
bun run setup:oauth            # once
bun run fetch:cloudflared
bun run dev
```

```bash
bun test
bun run typecheck
bun run dist
```

## CI / Releases

- **Pull requests** → [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `typecheck` + `bun test`.
- **Push to `main`** → [`.github/workflows/release.yml`](.github/workflows/release.yml) builds macOS, Windows, and Linux installers and publishes a GitHub Release (`v{version}-main.{run_number}`).

Optional repository secrets:

| Secret | Purpose |
|--------|---------|
| `CLOUD_TUNNEL_OAUTH_CLIENT_ID` | Embeds Cloudflare OAuth Client ID in CI builds |
| `MAC_CSC_LINK` / `MAC_CSC_KEY_PASSWORD` | macOS code signing (base64 `.p12`) |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` | macOS notarization |
| `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Windows code signing (base64 `.pfx`) |

Without signing secrets, installers are still published (unsigned).

### API token fallback

Login screen still offers **Use API Token instead** for emergencies.

## Documentation

- [`AGENTS.md`](AGENTS.md) — agent rules and DOX rail
- [`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md) — architecture
- [`docs/PUBLISHER-OAUTH.md`](docs/PUBLISHER-OAUTH.md) — where Client ID comes from
- [`TODO.md`](TODO.md) — progress
