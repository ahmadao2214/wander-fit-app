import { Tabs } from 'expo-router'
import { Dumbbell, Calendar, User } from '@tamagui/lucide-icons'
import { ClientOnlyRoute } from '../../components/AuthGuard'

export default function ClientLayout() {
  return (
    <ClientOnlyRoute>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Workouts',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color as any} />,
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
      </Tabs>
    </ClientOnlyRoute>
  )
}
