import { Stack, useRouter } from 'expo-router'
import { useColorScheme, Pressable } from 'react-native'
import { ChevronLeft } from '@tamagui/lucide-icons'

/**
 * Training Science Stack Layout
 *
 * Provides native navigation header for the Training Science education screen.
 * Accessed from Profile tab, not shown as a tab itself.
 */
export default function TrainingScienceLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const router = useRouter()

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
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'TRAINING SCIENCE',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ChevronLeft size={28} color={isDark ? '#F8FAFC' : '#0F172A'} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  )
}
