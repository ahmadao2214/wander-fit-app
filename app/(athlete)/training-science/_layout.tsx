import { Stack, useRouter } from 'expo-router'
import { useColorScheme, Pressable } from 'react-native'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { Theme } from 'tamagui'
import { sportSchemeFor } from '../../../lib/sportScreen'
import { sportTheme } from '../../../lib/sportTokens'

/**
 * Training Science Stack Layout
 *
 * Provides native navigation header for the Training Science education screen.
 * Accessed from Profile tab, not shown as a tab itself. The header sits on
 * the basketball sport theme like the screen under it: the instrument ground,
 * chalk or ink words (issue #209).
 */
export default function TrainingScienceLayout() {
  const scheme = sportSchemeFor(useColorScheme())
  const theme = sportTheme('basketball', scheme)
  const ground = theme.instrumentBackground.hex
  const words = scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: ground,
        },
        headerTintColor: words,
        headerTitleStyle: {
          fontFamily: 'BebasNeue',
          fontSize: 18,
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Training science',
          headerLeft: () => (
            <Pressable onPress={() => router.canDismiss() ? router.dismiss() : router.back()} hitSlop={8}>
              <Theme name={scheme}>
                <ChevronLeft size={28} color="$color" />
              </Theme>
            </Pressable>
          ),
        }}
      />
    </Stack>
  )
}
