import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Users, PlusCircle, BarChart3 } from '@tamagui/lucide-icons'
import { TrainerOnlyRoute } from '../../components/AuthGuard'
import { brandPrimary } from '../../tamagui.config'

/**
 * Trainer Tab Layout
 * 
 * Navigation for trainers managing their athletes' programs.
 * 
 * Tabs:
 * - Clients: Athlete roster with status indicators
 * - Create: Workout builder and assignment
 * - Analytics: Performance overview
 */
export default function TrainerLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <TrainerOnlyRoute>
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
          name="create-workout"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color as any} />,
          }}
        />
      </Tabs>
    </TrainerOnlyRoute>
  )
}
