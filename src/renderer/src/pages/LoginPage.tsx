import { useState } from 'react'
import type { AuthState } from '@shared/types'
import { BrandMark } from '../components/BrandMark'

interface Props {
  onAuthenticated: (state: AuthState) => Promise<void>
  oauthConfigured: boolean
}

export default function LoginPage({
  onAuthenticated,
  oauthConfigured
}: Props): React.JSX.Element {
  const [apiToken, setApiToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loginOAuth = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const state = await window.cloudTunnel.loginOAuth()
      await onAuthenticated(state)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const loginToken = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const state = await window.cloudTunnel.loginApiToken(apiToken)
      await onAuthenticated(state)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hero-login">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: '1.25rem' }}>
          <BrandMark />
          <div>
            <h1 style={{ margin: 0 }}>Cloud Tunnel</h1>
          </div>
        </div>
        <p className="lede">
          Sign in to your Cloudflare account in the browser. After you approve
          access, your tunnels appear here automatically.
        </p>

        {error ? <div className="error-banner">{error}</div> : null}

        {!oauthConfigured ? (
          <div className="error-banner">
            This build is not linked to Cloudflare yet. The person who ships the
            app must run <span className="mono">bun run setup:oauth</span> once
            (creates an OAuth client in the Cloudflare dashboard and embeds the
            Client ID). End users never do that step.
          </div>
        ) : null}

        <div className="stack">
          <button
            className="btn btn-primary"
            disabled={busy || !oauthConfigured}
            onClick={() => void loginOAuth()}
          >
            {busy ? 'Waiting for browser…' : 'Sign in with Cloudflare'}
          </button>

          <div className="divider">or</div>

          {!showAdvanced ? (
            <button
              className="btn btn-ghost"
              onClick={() => setShowAdvanced(true)}
              type="button"
            >
              Use API Token instead
            </button>
          ) : (
            <>
              <label className="field">
                API Token
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Cloudflare API token"
                  autoComplete="off"
                />
              </label>
              <button
                className="btn btn-secondary"
                disabled={busy || !apiToken.trim()}
                onClick={() => void loginToken()}
              >
                Continue with API Token
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
