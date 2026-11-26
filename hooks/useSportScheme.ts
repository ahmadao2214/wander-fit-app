import { useColorScheme } from 'react-native'
import { sportSchemeFor } from '../lib/sportScreen'
import type { SportThemeName } from '../lib/sportTamaguiTheme'

/** The basketball sport theme for the device scheme: dark → chalkboard, light → whiteboard. */
export function useSportScheme(): SportThemeName {
  return sportSchemeFor(useColorScheme())
}
