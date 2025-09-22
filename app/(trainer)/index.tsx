import { YStack, XStack, H2, Text, Button, Card } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { Plus } from '@tamagui/lucide-icons'

export default function TrainerDashboard() {
  const { user, isLoading } = useAuth()
  
  const clients = useQuery(
    api.users.getTrainerClients,
    user ? { trainerId: user._id } : "skip"
  )

  const workoutStats = useQuery(
    api.workouts.getWorkoutStats,
    user ? {} : "skip"
  )

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Text>Loading...</Text>
      </YStack>
    )
  }

  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Text>Error loading user data</Text>
        <SignOutButton />
      </YStack>
    )
  }

  return (
    <YStack flex={1} gap="$4" px="$4" pt="$6" bg="$background">
      {/* Header */}
      <XStack justify="space-between" items="center">
        <YStack>
          <H2>Welcome back!</H2>
          <Text color="gray">{user.name}</Text>
        </YStack>
        <SignOutButton />
      </XStack>

      {/* Stats Cards */}
      <XStack gap="$3">
        <Card flex={1} p="$3">
          <YStack items="center" gap="$1">
            <Text fontSize="$6" fontWeight="bold" color="$blue10">
              {clients?.length || 0}
            </Text>
            <Text fontSize="$2" color="gray">
              Active Clients
            </Text>
          </YStack>
        </Card>
        
        <Card flex={1} p="$3">
          <YStack items="center" gap="$1">
            <Text fontSize="$6" fontWeight="bold" color="$green10">
              {workoutStats?.activeWorkouts || 0}
            </Text>
            <Text fontSize="$2" color="gray">
              Active Workouts
            </Text>
          </YStack>
        </Card>
        
        <Card flex={1} p="$3">
          <YStack items="center" gap="$1">
            <Text fontSize="$6" fontWeight="bold" color="purple">
              {workoutStats?.totalTrainingMinutes || 0}
            </Text>
            <Text fontSize="$2" color="gray">
              Total Minutes
            </Text>
          </YStack>
        </Card>
      </XStack>

      {/* Clients Section */}
      <YStack gap="$3">
        <XStack justify="space-between" items="center">
          <Text fontSize="$5" fontWeight="600">
            Your Clients
          </Text>
          <Button
            size="$3"
            variant="outlined"
            icon={Plus}
            onPress={() => {
              // TODO: Navigate to add client screen
              console.log('Add client pressed')
            }}
          >
            Add Client
          </Button>
        </XStack>

        {clients && clients.length > 0 ? (
          <YStack gap="$2">
            {clients.map((client) => (
              <Card key={client._id} p="$3" pressStyle={{ scale: 0.98 }}>
                <XStack justify="space-between" items="center">
                  <YStack gap="$1">
                    <Text fontWeight="600">{client.name}</Text>
                    <Text fontSize="$2" color="gray">
                      {client.email}
                    </Text>
                  </YStack>
                  <Button
                    size="$2"
                    variant="outlined"
                    onPress={() => {
                      // TODO: Navigate to client details
                      console.log('View client:', client._id)
                    }}
                  >
                    View
                  </Button>
                </XStack>
              </Card>
            ))}
          </YStack>
        ) : (
          <Card p="$4">
            <YStack items="center" gap="$2">
              <Text text="center" color="gray">
                No clients yet. Add your first client to get started!
              </Text>
              <Button
                size="$3"
                icon={Plus}
                onPress={() => {
                  // TODO: Navigate to add client screen
                  console.log('Add first client pressed')
                }}
              >
                Add Your First Client
              </Button>
            </YStack>
          </Card>
        )}
      </YStack>
    </YStack>
  )
}
