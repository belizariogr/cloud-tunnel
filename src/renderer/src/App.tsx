import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { AuthState, TunnelView } from '@shared/types'
import { BrandMark } from './components/BrandMark'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TunnelFormPage from './pages/TunnelFormPage'
import SettingsPage from './pages/SettingsPage'

export default function App(): React.JSX.Element {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [tunnels, setTunnels] = useState<TunnelView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const refreshTunnels = async (): Promise<void> => {
    try {
      const list = await window.cloudTunnel.refreshTunnels()
      setTunnels(list)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        let state = await window.cloudTunnel.getAuthState()
        if (!mounted) return
        if (state.authenticated) {
          try {
            await window.cloudTunnel.listAccounts()
            state = await window.cloudTunnel.getAuthState()
          } catch (err) {
            console.error('Failed to refresh accounts', err)
          }
        }
        if (!mounted) return
        setAuth(state)
        if (state.authenticated) {
          await refreshTunnels()
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    const offAuth = window.cloudTunnel.onAuthChanged((next) => {
      setAuth(next)
      if (!next.authenticated) {
        setTunnels([])
        navigate('/')
      }
    })
    const offTunnels = window.cloudTunnel.onTunnelsChanged((next) => {
      setTunnels(next)
    })

    return () => {
      mounted = false
      offAuth()
      offTunnels()
    }
  }, [navigate])

  if (loading || !auth) {
    return (
      <div className="hero-login">
        <div className="muted">Starting Cloud Tunnel…</div>
      </div>
    )
  }

  if (!auth.authenticated) {
    return (
      <LoginPage
        oauthConfigured={auth.oauthConfigured}
        onAuthenticated={async (state) => {
          setAuth(state)
          await refreshTunnels()
          navigate('/')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>Cloud Tunnel</h1>
            <p>Activate Cloudflare tunnels when you need them</p>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Tunnels
          </NavLink>
          <NavLink to="/tunnels/new">New</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="content">
        {error ? <div className="error-banner">{error}</div> : null}
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                tunnels={tunnels}
                onRefresh={refreshTunnels}
                onError={setError}
              />
            }
          />
          <Route
            path="/tunnels/new"
            element={
              <TunnelFormPage
                onSaved={async () => {
                  await refreshTunnels()
                  navigate('/')
                }}
              />
            }
          />
          <Route
            path="/tunnels/:tunnelId"
            element={
              <TunnelFormPage
                tunnels={tunnels}
                onSaved={async () => {
                  await refreshTunnels()
                  navigate('/')
                }}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                auth={auth}
                onAccountChange={async () => {
                  await refreshTunnels()
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
