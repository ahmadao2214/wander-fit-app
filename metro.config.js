// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getSentryExpoConfig } = require('@sentry/react-native/metro')
const { withTamagui } = require('@tamagui/metro-plugin')

const config = getSentryExpoConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
  // Session replays and in-app feedback are handled outside Sentry; exclude
  // those web sub-packages to keep bundle size lean and avoid capturing youth UI input.
  includeWebReplay: false,
  includeWebFeedback: false,
})

const tamaguiConfig = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
  outputCSS: './tamagui-web.css',
})

// babel/lucide-direct-imports.js points each icon import at its own file. The package doesn't list
// those files in its "exports", so resolve them by file path, as Metro would after warning.
const LUCIDE_ICON_FILES = '@tamagui/lucide-icons/dist/esm/icons/'
const resolveRequest = tamaguiConfig.resolver.resolveRequest
tamaguiConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(LUCIDE_ICON_FILES)) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform
    )
  }
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = tamaguiConfig
