import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Dumbbell, Calendar, User, BookOpen } from '@tamagui/lucide-icons'
import { AthleteOnlyRoute } from '../../components/AuthGuard'
import { brandPrimary } from '../../tamagui.config'

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

  return (
    <AthleteOnlyRoute>
      <Tabs
        screenOptions={{
          // Electric Blue for active tab (brand primary)
          tabBarActiveTintColor: brandPrimary,
          // Muted slate for inactive tabs
          tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
          // Tab bar styling
          tabBarStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
            borderTopWidth: 1,
            paddingTop: 4,
            height: 60,
          },
          tabBarLabelStyle: {
            fontFamily: 'PlusJakartaSans',
            fontSize: 11,
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
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as any} />,
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
            href: null, // This IS the recommended pattern per Expo docs for nested stacks
          }}
        />
      </Tabs>
    </AthleteOnlyRoute>
  )
}
