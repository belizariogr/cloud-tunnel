import type { AccountInfo, ZoneInfo } from '@shared/types'

const API_BASE = 'https://api.cloudflare.com/client/v4'

export interface CfTunnel {
  id: string
  name: string
  status: string
  created_at: string
  connections?: Array<{
    id?: string
    colo_name?: string
    is_pending_reconnect?: boolean
  }>
  config_src?: string
}

export interface CfIngressRule {
  hostname?: string
  path?: string
  service: string
}

export interface CfTunnelConfig {
  config?: {
    ingress?: CfIngressRule[]
  }
  source?: string
}

export interface CfDnsRecord {
  id: string
  type: string
  name: string
  content: string
}

interface CfResponse<T> {
  success: boolean
  errors: Array<{ code: number; message: string }>
  result: T
}

async function cfFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  const json = (await response.json()) as CfResponse<T>
  if (!response.ok || !json.success) {
    const message =
      json.errors?.map((e) => e.message).join('; ') ||
      `Cloudflare API error ${response.status}`
    throw new Error(message)
  }
  return json.result
}

export async function listAccounts(token: string): Promise<AccountInfo[]> {
  const result = await cfFetch<Array<{ id: string; name: string }>>(
    token,
    '/accounts?per_page=50'
  )
  return result.map((a) => ({ id: a.id, name: a.name }))
}

export async function listZones(
  token: string,
  accountId: string
): Promise<ZoneInfo[]> {
  const result = await cfFetch<Array<{ id: string; name: string }>>(
    token,
    `/zones?account.id=${encodeURIComponent(accountId)}&per_page=50`
  )
  return result.map((z) => ({ id: z.id, name: z.name }))
}

export async function listTunnels(
  token: string,
  accountId: string
): Promise<CfTunnel[]> {
  return cfFetch<CfTunnel[]>(
    token,
    `/accounts/${accountId}/cfd_tunnel?is_deleted=false&per_page=100`
  )
}

export async function getTunnel(
  token: string,
  accountId: string,
  tunnelId: string
): Promise<CfTunnel> {
  return cfFetch<CfTunnel>(
    token,
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}`
  )
}

export async function createTunnel(
  token: string,
  accountId: string,
  name: string
): Promise<CfTunnel> {
  return cfFetch<CfTunnel>(token, `/accounts/${accountId}/cfd_tunnel`, {
    method: 'POST',
    body: JSON.stringify({ name, config_src: 'cloudflare' })
  })
}

export async function deleteTunnel(
  token: string,
  accountId: string,
  tunnelId: string
): Promise<void> {
  await cfFetch(token, `/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
    method: 'DELETE'
  })
}

export async function getTunnelConfiguration(
  token: string,
  accountId: string,
  tunnelId: string
): Promise<CfTunnelConfig> {
  return cfFetch<CfTunnelConfig>(
    token,
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`
  )
}

export async function putTunnelConfiguration(
  token: string,
  accountId: string,
  tunnelId: string,
  hostname: string,
  service: string
): Promise<CfTunnelConfig> {
  return cfFetch<CfTunnelConfig>(
    token,
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
    {
      method: 'PUT',
      body: JSON.stringify({
        config: {
          ingress: [
            { hostname, service, originRequest: {} },
            { service: 'http_status:404' }
          ]
        }
      })
    }
  )
}

export async function getTunnelToken(
  token: string,
  accountId: string,
  tunnelId: string
): Promise<string> {
  return cfFetch<string>(
    token,
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`
  )
}

export async function deleteTunnelConnections(
  token: string,
  accountId: string,
  tunnelId: string
): Promise<void> {
  await cfFetch(
    token,
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`,
    { method: 'DELETE' }
  )
}

export async function findDnsRecordByName(
  token: string,
  zoneId: string,
  name: string
): Promise<CfDnsRecord | null> {
  const result = await cfFetch<CfDnsRecord[]>(
    token,
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(name)}`
  )
  return result[0] ?? null
}

export async function createDnsCname(
  token: string,
  zoneId: string,
  name: string,
  tunnelId: string
): Promise<CfDnsRecord> {
  return cfFetch<CfDnsRecord>(token, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'CNAME',
      name,
      content: `${tunnelId}.cfargotunnel.com`,
      proxied: true,
      ttl: 1
    })
  })
}

export async function updateDnsCname(
  token: string,
  zoneId: string,
  recordId: string,
  name: string,
  tunnelId: string
): Promise<CfDnsRecord> {
  return cfFetch<CfDnsRecord>(
    token,
    `/zones/${zoneId}/dns_records/${recordId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        type: 'CNAME',
        name,
        content: `${tunnelId}.cfargotunnel.com`,
        proxied: true,
        ttl: 1
      })
    }
  )
}

export async function deleteDnsRecord(
  token: string,
  zoneId: string,
  recordId: string
): Promise<void> {
  await cfFetch(token, `/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE'
  })
}

/** Parse first hostname and service URL from tunnel ingress. */
export function parseIngress(
  config: CfTunnelConfig | null | undefined
): { hostname?: string; localHost: string; localPort: number; protocol: 'http' | 'https' } {
  const rule = config?.config?.ingress?.find((r) => r.hostname && r.service)
  if (!rule?.service) {
    return { localHost: 'localhost', localPort: 8080, protocol: 'http' }
  }

  try {
    const url = new URL(rule.service)
    const protocol = url.protocol.replace(':', '') as 'http' | 'https'
    return {
      hostname: rule.hostname,
      localHost: url.hostname || 'localhost',
      localPort: url.port
        ? Number(url.port)
        : protocol === 'https'
          ? 443
          : 80,
      protocol: protocol === 'https' ? 'https' : 'http'
    }
  } catch {
    return {
      hostname: rule.hostname,
      localHost: 'localhost',
      localPort: 8080,
      protocol: 'http'
    }
  }
}

export function buildServiceUrl(
  protocol: 'http' | 'https',
  host: string,
  port: number
): string {
  return `${protocol}://${host}:${port}`
}
