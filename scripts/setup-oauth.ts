import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Publisher one-time setup.
 *
 * End users never create a Client ID. YOU (the app publisher) create one
 * Cloudflare OAuth client, save it here, and every build embeds it so users
 * only click “Sign in with Cloudflare”.
 */

const ROOT = join(import.meta.dir, '..')
const OUT = join(ROOT, 'resources', 'oauth-client.json')
const DASH = 'https://dash.cloudflare.com/?to=/:account/oauth-apps'

const existingArg = process.argv.find((a) => a.startsWith('--client-id='))
const clientIdFromArg = existingArg?.slice('--client-id='.length)?.trim()

console.log(`
Cloud Tunnel — OAuth publisher setup (once)

End users do NOT do this. Only the person who ships the app does.

1. Open Cloudflare → Manage Account → OAuth clients
   ${DASH}

2. Create a client with:
   - Grant: Authorization Code
   - Token authentication: none (PKCE)
   - Redirect URL: http://127.0.0.1:53682/callback
   - On the Scopes step, search and select (exact dashboard names):
       • Account Settings Read  (or Account Read)
       • Cloudflare Tunnel Edit  (and/or Cloudflare One Connectors Edit)
       • Zone Read
       • DNS Edit / DNS Write
   - Leave scopes: [] in oauth-client.json so the app requests exactly what
     you attached to the client (avoids invalid_scope).

3. Copy the Client ID (public; not a secret) and paste it below.

Private client = only members of YOUR Cloudflare account can sign in.
Public client  = any Cloudflare user (requires domain verification).
`)

try {
  await Bun.$`xdg-open ${DASH}`.quiet()
} catch {
  try {
    await Bun.$`open ${DASH}`.quiet()
  } catch {
    console.log('(Open the URL above in your browser.)\n')
  }
}

let clientId = clientIdFromArg ?? ''
if (!clientId) {
  const prompt = 'Paste OAuth Client ID (or leave empty to cancel): '
  process.stdout.write(prompt)
  clientId = (await new Response(Bun.stdin).text()).trim().split(/\r?\n/)[0] ?? ''
}

if (!clientId) {
  console.error('No Client ID provided. Nothing written.')
  process.exit(1)
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      clientId,
      scopes: [
        'account.read',
        'zone.read',
        'dns.write',
        'cloudflare-tunnel.read',
        'cloudflare-tunnel.write'
      ]
    },
    null,
    2
  ) + '\n',
  'utf8'
)
console.log(`
Saved → ${OUT}

Attach the same scopes on the OAuth client in the dashboard (dot ids, not colon).
Verify with: CLOUDFLARE_API_TOKEN=... bun run oauth:scopes

Next:
  bun run dev
  bun run dist
`)

if (existsSync(OUT)) {
  const check = JSON.parse(readFileSync(OUT, 'utf8')) as { clientId: string }
  console.log(`Configured clientId: ${check.clientId.slice(0, 8)}…`)
}
