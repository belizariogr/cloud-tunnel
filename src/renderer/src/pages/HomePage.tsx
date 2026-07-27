import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TunnelView } from '@shared/types'
import { TunnelCard } from '../components/TunnelCard'

interface Props {
  tunnels: TunnelView[]
  onRefresh: () => Promise<void>
  onError: (message: string | null) => void
}

export default function HomePage({
  tunnels,
  onRefresh,
  onError
}: Props): React.JSX.Element {
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [takeoverTarget, setTakeoverTarget] = useState<TunnelView | null>(null)

  const activate = async (tunnel: TunnelView, takeover: boolean): Promise<void> => {
    setBusyId(tunnel.tunnelId)
    onError(null)
    try {
      await window.cloudTunnel.activateTunnel(tunnel.tunnelId, takeover)
      setTakeoverTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('TAKEOVER_REQUIRED')) {
        setTakeoverTarget(tunnel)
      } else {
        onError(message)
      }
    } finally {
      setBusyId(null)
    }
  }

  const toggle = async (tunnel: TunnelView): Promise<void> => {
    if (tunnel.status === 'active_local' || tunnel.status === 'starting') {
      setBusyId(tunnel.tunnelId)
      try {
        await window.cloudTunnel.deactivateTunnel(tunnel.tunnelId)
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusyId(null)
      }
      return
    }
    await activate(tunnel, false)
  }

  return (
    <div className="stack">
      <div className="row spread">
        <div>
          <h2 style={{ margin: 0 }}>Your tunnels</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Synced from Cloudflare. Activate only when you need a local connector.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => void onRefresh()}
          >
            Refresh
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate('/tunnels/new')}
          >
            New tunnel
          </button>
        </div>
      </div>

      {tunnels.length === 0 ? (
        <div className="panel empty">
          <h2>No tunnels yet</h2>
          <p>Create a tunnel to expose a local service through Cloudflare.</p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate('/tunnels/new')}
          >
            Create tunnel
          </button>
        </div>
      ) : (
        <div className="tunnel-list">
          {tunnels.map((tunnel) => (
            <TunnelCard
              key={tunnel.tunnelId}
              tunnel={tunnel}
              busy={busyId === tunnel.tunnelId}
              onToggle={() => void toggle(tunnel)}
              onEdit={() => navigate(`/tunnels/${tunnel.tunnelId}`)}
              onCopy={() => {
                if (tunnel.publicHostname) {
                  void navigator.clipboard.writeText(
                    `https://${tunnel.publicHostname}`
                  )
                }
              }}
              onDelete={() => {
                if (
                  !confirm(
                    `Delete tunnel “${tunnel.name}”? This removes it from Cloudflare and DNS.`
                  )
                ) {
                  return
                }
                void (async () => {
                  try {
                    await window.cloudTunnel.deleteTunnel(tunnel.tunnelId)
                    await onRefresh()
                  } catch (err) {
                    onError(err instanceof Error ? err.message : String(err))
                  }
                })()
              }}
            />
          ))}
        </div>
      )}

      {takeoverTarget ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Take over tunnel?</h2>
            <p>
              <strong>{takeoverTarget.name}</strong> is already connected
              elsewhere. Taking over disconnects existing connectors and runs
              this tunnel on this computer.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setTakeoverTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void activate(takeoverTarget, true)}
              >
                Take over
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
