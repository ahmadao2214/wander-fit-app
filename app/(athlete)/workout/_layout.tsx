import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

/**
 * Workout Stack Layout (Nested inside Tabs)
 *
 * This follows Expo Router's recommended pattern for stacks inside tabs.
 * See: https://docs.expo.dev/router/basics/common-navigation-patterns/#stacks-inside-tabs-nested-navigators
 *
 * The workout detail and execution screens live here, separate from the tab bar.
 */
export default function WorkoutLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: true,
        headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
        headerTintColor: isDark ? '#F8FAFC' : '#0F172A',
        headerTitleStyle: { fontFamily: 'BebasNeue', fontSize: 18 },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'WORKOUT',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="execute"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

