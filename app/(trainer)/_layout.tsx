import { Tabs } from 'expo-router'
import { Users, PlusCircle, BarChart3 } from '@tamagui/lucide-icons'
import { TrainerOnlyRoute } from '../../components/AuthGuard'

export default function TrainerLayout() {

  return (
    <TrainerOnlyRoute>
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
    </TrainerOnlyRoute>
  )
}
