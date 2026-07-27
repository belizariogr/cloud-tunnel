import type { TunnelRuntimeStatus, TunnelView } from '@shared/types'

const LABELS: Record<TunnelRuntimeStatus, string> = {
  inactive: 'Inactive',
  active_local: 'Active here',
  active_remote: 'Active elsewhere',
  starting: 'Starting…',
  error: 'Error'
}

const CLASS: Record<TunnelRuntimeStatus, string> = {
  inactive: 'badge-inactive',
  active_local: 'badge-local',
  active_remote: 'badge-remote',
  starting: 'badge-starting',
  error: 'badge-error'
}

export default function StatusBadge({
  status
}: {
  status: TunnelRuntimeStatus
}): React.JSX.Element {
  return <span className={`badge ${CLASS[status]}`}>{LABELS[status]}</span>
}

export function TunnelCard({
  tunnel,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onCopy
}: {
  tunnel: TunnelView
  busy: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
}): React.JSX.Element {
  const active = tunnel.status === 'active_local' || tunnel.status === 'starting'

  return (
    <article className="tunnel-card">
      <div>
        <div className="row" style={{ marginBottom: '0.35rem' }}>
          <h3>{tunnel.name}</h3>
          <StatusBadge status={tunnel.status} />
        </div>
        <div className="tunnel-meta">
          {tunnel.publicHostname ? (
            <span className="mono">{tunnel.publicHostname}</span>
          ) : (
            <span>No public hostname</span>
          )}
          <span>
            → {tunnel.protocol}://{tunnel.localHost}:{tunnel.localPort}
          </span>
          {tunnel.errorMessage ? (
            <span style={{ color: 'var(--danger)' }}>{tunnel.errorMessage}</span>
          ) : null}
        </div>
      </div>
      <div className="actions">
        {tunnel.publicHostname ? (
          <button className="btn btn-ghost" type="button" onClick={onCopy}>
            Copy URL
          </button>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-danger" type="button" onClick={onDelete}>
          Delete
        </button>
        <button
          type="button"
          className={`toggle ${active ? 'on' : ''}`}
          aria-label={active ? 'Deactivate tunnel' : 'Activate tunnel'}
          disabled={busy || tunnel.status === 'starting'}
          onClick={onToggle}
        />
      </div>
    </article>
  )
}
