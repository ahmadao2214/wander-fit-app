const mockMakeRedirectUri = jest.fn((options?: { scheme?: string; path?: string }) =>
  options?.scheme ? `${options.scheme}://${options.path ?? ''}` : 'https://app.example/'
)
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (options?: { scheme?: string; path?: string }) => mockMakeRedirectUri(options),
}))
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))

import fs from 'node:fs'
import path from 'node:path'
import { OAUTH_PATH, OAUTH_SCHEME, oauthRedirectUrl } from '../oauthRedirect'

beforeEach(() => mockMakeRedirectUri.mockClear())

describe('oauthRedirectUrl', () => {
  it('sends iOS and Android back to wanderfit://oauth', () => {
    expect(oauthRedirectUrl('ios')).toBe('wanderfit://oauth')
    expect(oauthRedirectUrl('android')).toBe('wanderfit://oauth')
    expect(mockMakeRedirectUri).toHaveBeenCalledWith({ scheme: 'wanderfit', path: 'oauth' })
  })

  it('uses the current platform by default', () => {
    expect(oauthRedirectUrl()).toBe('wanderfit://oauth')
  })

  it('keeps the web on its own origin, with no custom scheme', () => {
    expect(oauthRedirectUrl('web')).toBe('https://app.example/')
    expect(mockMakeRedirectUri).toHaveBeenCalledWith(undefined)
  })

  it('uses the scheme app.json declares', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'))
    expect(appJson.expo.scheme).toBe(OAUTH_SCHEME)
    expect(OAUTH_PATH).toBe('oauth')
  })
})
