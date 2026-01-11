import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Users, Calendar, User } from '@tamagui/lucide-icons'
import { ParentOnlyRoute } from '../../components/AuthGuard'
import { brandPrimary } from '../../tamagui.config'

/**
 * Parent Tab Layout
 *
 * The main navigation for authenticated parent users.
 *
 * Tabs:
 * - Athletes: List of linked athletes with quick access
 * - Calendar: Family calendar view (future: PR 6)
 * - Profile: Parent profile and settings
 *
 * Parents don't need to complete intake - they manage athletes instead.
 */
export default function ParentLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <ParentOnlyRoute>
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
            title: 'Athletes',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
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
      </Tabs>
    </ParentOnlyRoute>
  )
}
