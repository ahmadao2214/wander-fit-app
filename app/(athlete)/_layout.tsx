import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Dumbbell, Calendar, User, Clock } from '@tamagui/lucide-icons'
import { AthleteOnlyRoute } from '../../components/AuthGuard'
import { tabTints } from '../../tamagui.config'

/**
 * Athlete Tab Layout
 * 
 * The main navigation for authenticated athletes who have completed intake.
 * 
 * Tabs:
 * - Today: Scheduled workout + quick start
 * - Program: Training program browser with drag-to-reorder (GPP/SPP/SSP)
 * - History: Completed workouts log
 * - Profile: Athlete info + stats (Settings is a separate route)
 * 
 * Note: Workout detail screens are handled by a separate Stack navigator
 * in app/(athlete)/workout/_layout.tsx following Expo Router's recommended
 * pattern for stacks inside tabs.
 */
export default function AthleteLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()
  const tint = tabTints[isDark ? 'dark' : 'light']

  return (
    <AthleteOnlyRoute>
      <Tabs
        screenOptions={{
          // Theme tokens, so both labels pass AA on the bar in light and dark.
          // The old hardcoded #94A3B8 on white was 2.6:1, and #2563EB on navy 3.5:1.
          tabBarActiveTintColor: tint.active,
          tabBarInactiveTintColor: tint.inactive,
          // Tab bar styling - account for Android navigation bar
          tabBarStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
            borderTopWidth: 1,
            paddingTop: 4,
            paddingBottom: insets.bottom,
            height: 60 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontFamily: 'PlusJakartaSans',
            // Caption size, the app's text floor
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="program"
          options={{
            title: 'Program',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <Clock size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color as any} />,
          }}
        />
        {/* Workout stack is nested - has its own _layout.tsx */}
        <Tabs.Screen
          name="workout"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        {/* Training Science Stack - accessed via Profile, not a tab */}
        <Tabs.Screen
          name="training-science"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            headerShown: false, // Stack has its own header
          }}
        />
        {/* App Settings - opened from Profile, not a tab. Hidden the same way
            as the screens above: with href: null, a push to it on web landed
            on Today instead. */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
      </Tabs>
    </AthleteOnlyRoute>
  )
}
