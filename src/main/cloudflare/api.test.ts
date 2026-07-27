import { describe, expect, test } from 'bun:test'
import {
  buildServiceUrl,
  parseIngress,
  type CfTunnelConfig
} from './api'
import {
  cloudflaredBinaryName,
  cloudflaredPlatformKey
} from '../tunnel/platform'

describe('parseIngress', () => {
  test('returns defaults when config missing', () => {
    expect(parseIngress(null)).toEqual({
      localHost: 'localhost',
      localPort: 8080,
      protocol: 'http'
    })
  })

  test('parses http service and hostname', () => {
    const config: CfTunnelConfig = {
      config: {
        ingress: [
          { hostname: 'app.example.com', service: 'http://127.0.0.1:3000' },
          { service: 'http_status:404' }
        ]
      }
    }
    expect(parseIngress(config)).toEqual({
      hostname: 'app.example.com',
      localHost: '127.0.0.1',
      localPort: 3000,
      protocol: 'http'
    })
  })

  test('defaults https port to 443', () => {
    const config: CfTunnelConfig = {
      config: {
        ingress: [{ hostname: 'secure.example.com', service: 'https://localhost' }]
      }
    }
    expect(parseIngress(config).localPort).toBe(443)
    expect(parseIngress(config).protocol).toBe('https')
  })
})

describe('buildServiceUrl', () => {
  test('builds origin URL', () => {
    expect(buildServiceUrl('http', 'localhost', 8080)).toBe(
      'http://localhost:8080'
    )
  })
})

describe('cloudflared platform keys', () => {
  test('maps linux x64', () => {
    expect(cloudflaredPlatformKey('linux', 'x64')).toBe('linux-x64')
    expect(cloudflaredBinaryName('linux')).toBe('cloudflared')
  })

  test('maps windows', () => {
    expect(cloudflaredPlatformKey('win32', 'x64')).toBe('win32-x64')
    expect(cloudflaredBinaryName('win32')).toBe('cloudflared.exe')
  })
})
