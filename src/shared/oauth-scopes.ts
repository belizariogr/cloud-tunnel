/**
 * Required OAuth scopes for Cloud Tunnel (publisher embeds these).
 *
 * Format rules from Cloudflare OpenAPI / OAuth client docs:
 * - Use **dot-delimited** labels (e.g. `account.read`)
 * - Colon-delimited scopes (e.g. `account:read`) are **rejected** → invalid_scope
 * - Labels come from GET /oauth/scopes (`id` field); names match API token permissions
 *
 * @see https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/
 * @see https://developers.cloudflare.com/fundamentals/api/reference/permissions/
 * @see https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/
 */
export const REQUIRED_OAUTH_SCOPES = [
  /** List accounts / account membership — OpenAPI example scope id */
  'account.read',
  /** List zones in the account */
  'zone.read',
  /** Create/update proxied DNS CNAME for public hostnames */
  'dns.write',
  /** View tunnels (API token permission: Cloudflare Tunnel Read) */
  'cloudflare-tunnel.read',
  /** Create/configure/delete tunnels + tokens + connections (Cloudflare Tunnel Write) */
  'cloudflare-tunnel.write'
] as const

export type RequiredOAuthScope = (typeof REQUIRED_OAUTH_SCOPES)[number]
