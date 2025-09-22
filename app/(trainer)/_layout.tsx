import { Tabs, Redirect } from 'expo-router'
import { Users, PlusCircle, BarChart3 } from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'
import { YStack, Text } from 'tamagui'

export default function TrainerLayout() {
  const { isLoading, role } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Loading...</Text>
      </YStack>
    )
  }

  if (role !== 'trainer') {
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
          title: 'Clients',
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
  )
}
