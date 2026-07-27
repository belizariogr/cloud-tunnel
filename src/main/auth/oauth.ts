import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { shell } from 'electron'
import { OAUTH_REDIRECT_URI } from '@shared/oauth-config'

const AUTHORIZE_URL = 'https://dash.cloudflare.com/oauth2/auth'
const TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token'
const CALLBACK_PORT = 53682


export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  tokenType: string
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

function listenOnce(
  port: number
): Promise<{ code: string; state: string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const error = url.searchParams.get('error')
        if (error) {
          const description =
            url.searchParams.get('error_description') ??
            url.searchParams.get('error_hint') ??
            ''
          const detail = description
            ? `${error}: ${description.replace(/\+/g, ' ')}`
            : error
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(
            `<html><body><h1>Login failed</h1><p>${detail}</p></body></html>`
          )
          reject(new Error(detail))
          server.close()
          return
        }
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        if (!code || !state) {
          res.writeHead(400)
          res.end('Missing code or state')
          reject(new Error('Missing authorization code'))
          server.close()
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body><h1>Signed in</h1><p>You can close this window and return to Cloud Tunnel.</p></body></html>'
        )
        resolve({
          code,
          state,
          close: () => {
            server.close()
          }
        })
      } catch (err) {
        reject(err)
        server.close()
      }
    })

    server.listen(port, '127.0.0.1', () => {
      // ready
    })
    server.on('error', reject)
  })
}

export async function loginWithOAuth(
  clientId: string,
  scopes: string[] = []
): Promise<OAuthTokens> {
  if (!clientId.trim()) {
    throw new Error(
      'OAuth Client ID is missing. Run: bun run setup:oauth (publisher once), then restart the app.'
    )
  }

  const { verifier, challenge } = generatePkce()
  const state = base64Url(randomBytes(16))
  const redirectUri = OAUTH_REDIRECT_URI

  const authUrl = new URL(AUTHORIZE_URL)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  // Only send scope when explicitly configured. Invented scopes (e.g. tunnel:edit)
  // cause invalid_scope unless they were attached to this OAuth client.
  if (scopes.length > 0) {
    authUrl.searchParams.set('scope', scopes.join(' '))
  }

  const callbackPromise = listenOnce(CALLBACK_PORT)
  await shell.openExternal(authUrl.toString())

  const { code, state: returnedState, close } = await callbackPromise
  close()

  if (returnedState !== state) {
    throw new Error('OAuth state mismatch')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type: string
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined,
    tokenType: json.token_type
  }
}

export async function refreshOAuthToken(
  clientId: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type: string
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined,
    tokenType: json.token_type
  }
}
