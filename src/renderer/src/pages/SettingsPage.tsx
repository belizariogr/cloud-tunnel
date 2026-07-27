import { useEffect, useState } from 'react'
import type { AppSettings, AuthState } from '@shared/types'

interface Props {
  auth: AuthState
  onAccountChange: () => Promise<void>
}

export default function SettingsPage({
  auth,
  onAccountChange
}: Props): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [cloudflaredVersion, setCloudflaredVersion] = useState('…')
  const [appVersion, setAppVersion] = useState('…')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setSettings(await window.cloudTunnel.getSettings())
      setCloudflaredVersion(await window.cloudTunnel.cloudflaredVersion())
      setAppVersion(await window.cloudTunnel.appVersion())
      await window.cloudTunnel.listAccounts()
    })()
  }, [])

  if (!settings) {
    return <div className="muted">Loading settings…</div>
  }

  const save = async (partial: Partial<AppSettings>): Promise<void> => {
    const next = await window.cloudTunnel.setSettings(partial)
    setSettings(next)
    setMessage('Saved')
    setTimeout(() => setMessage(null), 1500)
  }

  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>

      <div className="stack">
        <label className="field">
          Cloudflare account
          <select
            value={settings.accountId ?? ''}
            onChange={(e) => {
              const accountId = e.target.value
              void (async () => {
                await window.cloudTunnel.selectAccount(accountId)
                await save({ accountId })
                await onAccountChange()
              })()
            }}
          >
            {auth.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className="field"
          style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}
        >
          <input
            type="checkbox"
            checked={settings.restoreActiveOnLaunch}
            onChange={(e) => {
              const restoreActiveOnLaunch = e.target.checked
              setSettings({ ...settings, restoreActiveOnLaunch })
              void save({ restoreActiveOnLaunch })
            }}
          />
          Restore previously active tunnels when the app starts
        </label>

        <div className="muted">
          <div>
            App version: <span className="mono">{appVersion}</span>
          </div>
          <div>
            Bundled cloudflared:{' '}
            <span className="mono">{cloudflaredVersion}</span>
          </div>
          <div>
            Auth mode: <span className="mono">{auth.mode ?? 'none'}</span>
          </div>
          <div>
            Cloudflare sign-in:{' '}
            <span className="mono">
              {auth.oauthConfigured ? 'ready' : 'not configured (publisher)'}
            </span>
          </div>
        </div>

        {message ? <div className="muted">{message}</div> : null}

        <div>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => void window.cloudTunnel.logout()}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
