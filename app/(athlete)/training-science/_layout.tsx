import { Stack } from 'expo-router'
import { useColorScheme, PlatformColor } from 'react-native'

/**
 * Training Science Stack Layout
 *
 * Provides native navigation header for the Training Science education screen.
 * Accessed from Profile tab, not shown as a tab itself.
 */
export default function TrainingScienceLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        },
        headerTintColor: isDark ? '#F8FAFC' : '#0F172A',
        headerTitleStyle: {
          fontFamily: 'BebasNeue',
          fontSize: 18,
        },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'TRAINING SCIENCE',
        }}
      />
    </Stack>
  )
}
