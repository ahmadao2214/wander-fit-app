import * as AuthSession from 'expo-auth-session'
import { Platform } from 'react-native'

/** The app's deep-link scheme. It matches `expo.scheme` in app.json. */
export const OAUTH_SCHEME = 'wanderfit'
/** The path Clerk sends the browser back to after Apple or Google sign-in. */
export const OAUTH_PATH = 'oauth'

/**
 * Where Clerk returns after an Apple or Google sign-in. Native builds use
 * `wanderfit://oauth`, which must be in Clerk's allowed redirect URLs. The web
 * returns to the page it started on, so it takes no custom scheme.
 */
export function oauthRedirectUrl(os: typeof Platform.OS = Platform.OS): string {
  return os === 'web'
    ? AuthSession.makeRedirectUri()
    : AuthSession.makeRedirectUri({ scheme: OAUTH_SCHEME, path: OAUTH_PATH })
}
