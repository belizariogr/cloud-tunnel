import { describe, expect, test } from 'bun:test'
import { isValidOAuthClientId, pickOAuthClientId } from './oauth-config'

describe('isValidOAuthClientId', () => {
  test('rejects placeholders', () => {
    expect(isValidOAuthClientId('PASTE_YOUR_CLOUDFLARE_OAUTH_CLIENT_ID_HERE')).toBe(
      false
    )
    expect(isValidOAuthClientId('example-id')).toBe(false)
  })

  test('accepts real-looking ids', () => {
    expect(isValidOAuthClientId('ee08c1114fadd4d22b32c9fb33363e48')).toBe(true)
  })
})

describe('pickOAuthClientId', () => {
  test('prefers builtin over file and env', () => {
    expect(
      pickOAuthClientId({
        builtinClientId: 'ee08c1114fadd4d22b32c9fb33363e48',
        fileClientId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        envClientId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      })
    ).toBe('ee08c1114fadd4d22b32c9fb33363e48')
  })

  test('skips placeholder builtin and uses file', () => {
    expect(
      pickOAuthClientId({
        builtinClientId: 'PASTE_YOUR_CLOUDFLARE_OAUTH_CLIENT_ID_HERE',
        fileClientId: 'ee08c1114fadd4d22b32c9fb33363e48',
        envClientId: ''
      })
    ).toBe('ee08c1114fadd4d22b32c9fb33363e48')
  })

  test('returns empty when nothing configured', () => {
    expect(pickOAuthClientId({ builtinClientId: '' })).toBe('')
  })
})
