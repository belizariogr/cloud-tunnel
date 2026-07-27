import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TunnelProtocol, TunnelView, ZoneInfo } from '@shared/types'

interface Props {
  tunnels?: TunnelView[]
  onSaved: () => Promise<void>
}

export default function TunnelFormPage({
  tunnels = [],
  onSaved
}: Props): React.JSX.Element {
  const { tunnelId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(tunnelId)
  const existing = tunnels.find((t) => t.tunnelId === tunnelId)

  const [zones, setZones] = useState<ZoneInfo[]>([])
  const [name, setName] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [localHost, setLocalHost] = useState('localhost')
  const [localPort, setLocalPort] = useState(8080)
  const [protocol, setProtocol] = useState<TunnelProtocol>('http')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prevent live tunnel refreshes from overwriting what the user is typing.
  const hydratedTunnelId = useRef<string | null>(null)
  const dnsHydratedFor = useRef<string | null>(null)

  useEffect(() => {
    void window.cloudTunnel.listZones().then((z) => {
      setZones(z)
      setZoneId((current) => current || z[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    hydratedTunnelId.current = null
    dnsHydratedFor.current = null
    if (!tunnelId) {
      setName('')
      setSubdomain('')
      setLocalHost('localhost')
      setLocalPort(8080)
      setProtocol('http')
      setError(null)
    }
  }, [tunnelId])

  useEffect(() => {
    if (!isEdit || !existing) return
    if (hydratedTunnelId.current === existing.tunnelId) return
    hydratedTunnelId.current = existing.tunnelId
    setName(existing.name)
    setLocalHost(existing.localHost)
    setLocalPort(existing.localPort)
    setProtocol(existing.protocol)
  }, [isEdit, existing])

  useEffect(() => {
    if (!existing?.publicHostname || zones.length === 0) return
    if (dnsHydratedFor.current === existing.tunnelId) return
    const zone = zones.find((z) => existing.publicHostname!.endsWith(z.name))
    if (!zone) return
    dnsHydratedFor.current = existing.tunnelId
    setZoneId(zone.id)
    const sub = existing.publicHostname
      .slice(0, -(zone.name.length + 1))
      .replace(/\.$/, '')
    setSubdomain(sub)
  }, [existing, zones])

  const selectedZone = zones.find((z) => z.id === zoneId)
  const hostname =
    subdomain && selectedZone
      ? `${subdomain}.${selectedZone.name}`
      : existing?.publicHostname ?? ''

  const submit = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      if (isEdit && tunnelId) {
        await window.cloudTunnel.updateTunnel({
          tunnelId,
          name: name.trim() || undefined,
          zoneId: zoneId || undefined,
          hostname: hostname || undefined,
          localHost: localHost.trim() || 'localhost',
          localPort: Number(localPort),
          protocol
        })
      } else {
        if (!name.trim() || !zoneId || !subdomain.trim()) {
          throw new Error('Name, zone, and subdomain are required')
        }
        await window.cloudTunnel.createTunnel({
          name: name.trim(),
          zoneId,
          hostname,
          localHost: localHost.trim() || 'localhost',
          localPort: Number(localPort),
          protocol
        })
      }
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>
        {isEdit ? 'Edit tunnel' : 'New tunnel'}
      </h2>
      <p className="muted">
        Public hostname is created in your Cloudflare zone. Local origin is where
        traffic is forwarded on this computer.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="form-grid">
        <label className="field span-2">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-app"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="field">
          Zone
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            {zones.length === 0 ? (
              <option value="">Loading zones…</option>
            ) : null}
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Subdomain
          <input
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            placeholder="app"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="field span-2">
          Public hostname
          <input className="mono" value={hostname} readOnly tabIndex={-1} />
        </label>

        <label className="field">
          Protocol
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as TunnelProtocol)}
          >
            <option value="http">http</option>
            <option value="https">https</option>
          </select>
        </label>

        <label className="field">
          Local host
          <input
            value={localHost}
            onChange={(e) => setLocalHost(e.target.value)}
            placeholder="localhost"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="field">
          Local port
          <input
            type="number"
            min={1}
            max={65535}
            value={localPort}
            onChange={(e) => setLocalPort(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="row" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? 'Saving…' : 'Save tunnel'}
        </button>
      </div>
    </div>
  )
}
