# Publisher OAuth (where the Client ID comes from)

## Short answer

| Who | What they do |
|-----|----------------|
| **You (publisher)** | Once: create an OAuth client in the Cloudflare dashboard → `bun run setup:oauth` |
| **End users** | Only click **Sign in with Cloudflare** |

The Client ID is **not** generated inside this app and **not** created by each
user. Cloudflare issues it when **you** register the app under:

**Dashboard → Manage Account → OAuth clients**

## Why Cloudflare requires this

Same model as “Sign in with Google”: Google issues a client id to the *app*.
Users never paste it. Cloudflare’s API OAuth works the same way — there is no
anonymous “open dash.cloudflare.com and magically grant API access” for
third-party desktop apps without a registered client.

## Steps (once)

1. `bun run setup:oauth`
2. In the opened page, create a PKCE client (`token_endpoint_auth_method: none`)
3. Redirect URI: `http://127.0.0.1:53682/callback`
4. On **Scopes**, select the permissions that match the labels below
5. Paste the Client ID when prompted
6. Ship the app (`bun run dist`) — the ID is embedded at build time

## Required scopes (documented)

Cloudflare OAuth uses **dot-delimited** scope ids (colon form like `account:read`
is rejected → `invalid_scope`).

Sources:

- [Create an OAuth client](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/) — scope names map to API token permissions; use `GET /oauth/scopes`
- [OpenAPI `iam_oauth_client`](https://github.com/cloudflare/api-schemas) — “Colon-delimited scopes are not accepted. Dot-delimited scopes are validated against available OAuth API scopes”
- [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/) — Cloudflare Tunnel Read/Write, DNS Write, Zone Read, Account Settings/Read
- [Create a tunnel (API)](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/) — Account Cloudflare Tunnel Edit + Zone DNS Edit

Stored in [`resources/oauth-client.json`](../resources/oauth-client.json) as
`recommendedScopes` (documentation). Leave `"scopes": []` so Sign in does **not**
send a scope query param — Cloudflare then uses whatever you attached to the
OAuth client (avoids `invalid_scope` when a label is missing on the client).

After confirming labels exist via `bun run oauth:scopes`, you may copy them into
`"scopes": [...]` to request them explicitly.

## Common mistakes

### Placeholder Client ID → 404

If `oauth-client.json` still has `PASTE_YOUR_…`, Sign in opens a Cloudflare 404.
Put the real Client ID and restart `bun run dev`.

### `invalid_scope`

- Do not use colon scopes (`tunnel:edit`, `account:read`)
- Only request scopes registered on the OAuth client
- Redirect URI must be exactly `http://127.0.0.1:53682/callback`

## Private vs public

- **Private** (default): only people on the Cloudflare account that owns the
  OAuth client can authorize. Fine for personal / team use.
- **Public**: any Cloudflare user can sign in; requires verifying a domain on
  the OAuth client.
