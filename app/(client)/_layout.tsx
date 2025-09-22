import { Tabs, Redirect } from 'expo-router'
import { Dumbbell, Calendar, User } from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'
import { YStack, Text } from 'tamagui'

export default function ClientLayout() {
  const { isLoading, role } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Loading...</Text>
      </YStack>
    )
  }

  if (role !== 'client') {
    return <Redirect href="/" />
  }

  return (
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
  )
}
