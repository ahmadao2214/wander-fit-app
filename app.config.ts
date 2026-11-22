import type { ConfigContext, ExpoConfig } from 'expo/config'

const sentryOrg = process.env.SENTRY_ORG?.trim() || undefined
const sentryProject = process.env.SENTRY_PROJECT?.trim() || undefined
const sentryUrl = process.env.SENTRY_URL?.trim() || 'https://sentry.io/'
const hasUploadCredentials = Boolean(
  process.env.SENTRY_AUTH_TOKEN?.trim() && sentryOrg && sentryProject
)
const disableAutoUpload =
  process.env.SENTRY_DISABLE_AUTO_UPLOAD === 'true' || !hasUploadCredentials

const sentryPluginOptions: Record<string, unknown> = {
  url: sentryUrl,
  disableAutoUpload,
  ...(sentryOrg ? { organization: sentryOrg } : {}),
  ...(sentryProject ? { project: sentryProject } : {}),
}

/**
 * Dynamic Expo config layered on top of app.json.
 *
 * Keeps static app.json intact for scripts that read it directly, while wiring
 * @sentry/react-native/expo behind build-time environment variables so native
 * builds succeed cleanly before Sentry credentials are provisioned and
 * automatically upload iOS dSYMs + JS/Hermes source maps once SENTRY_AUTH_TOKEN,
 * SENTRY_ORG, and SENTRY_PROJECT are configured in EAS secrets/env vars.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const existingPlugins = config.plugins ?? []
  const hasSentryPlugin = existingPlugins.some((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin
    return name === '@sentry/react-native/expo' || name === '@sentry/react-native'
  })

  return {
    ...config,
    name: config.name ?? 'asra-fit',
    slug: config.slug ?? 'asra-fit',
    plugins: hasSentryPlugin
      ? existingPlugins
      : [...existingPlugins, ['@sentry/react-native/expo', sentryPluginOptions]],
  }
}
