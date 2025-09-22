import { YStack, XStack, H2, Text, Card, Button } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { Play, Clock } from '@tamagui/lucide-icons'

export default function ClientDashboard() {
  const { user, isLoading } = useAuth()
  
  const workouts = useQuery(
    api.workouts.getMyWorkouts,
    user ? {} : "skip"
  )

  const currentSession = useQuery(
    api.workoutSessions.getCurrentSession,
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
          <H2>Ready to train?</H2>
          <Text color="gray">{user.name}</Text>
        </YStack>
        <SignOutButton />
      </XStack>

      {/* Active Session Alert */}
      {currentSession && (
        <Card backgroundColor="$blue3" borderColor="$blue8" p="$3">
          <XStack items="center" gap="$3">
            <Clock color="$blue11" size={20} />
            <YStack flex={1}>
              <Text fontWeight="600" color="$blue11">
                Workout in Progress
              </Text>
              <Text fontSize="$2" color="$blue10">
                {currentSession.workout?.name}
              </Text>
            </YStack>
            <Button
              size="$3"
              background="$blue9"
              color="white"
              onPress={() => {
                // TODO: Navigate to workout execution
                console.log('Resume workout:', currentSession._id)
              }}
            >
              Resume
            </Button>
          </XStack>
        </Card>
      )}

      {/* Workouts Section */}
      <YStack gap="$3">
        <Text fontSize="$5" fontWeight="600">
          Your Workouts
        </Text>

        {workouts && workouts.length > 0 ? (
          <YStack gap="$2">
            {workouts.map((workout) => (
              <Card key={workout._id} p="$4" pressStyle={{ scale: 0.98 }}>
                <YStack gap="$3">
                  <YStack gap="$1">
                    <Text fontSize="$4" fontWeight="600">
                      {workout.name}
                    </Text>
                    {workout.description && (
                      <Text fontSize="$2" color="gray">
                        {workout.description}
                      </Text>
                    )}
                  </YStack>

                  <XStack gap="$2" items="center">
                    <Text fontSize="$2" color="gray">
                      {workout.exercises.length} exercises
                    </Text>
                    <Text fontSize="$2" color="gray">
                      •
                    </Text>
                    <Text fontSize="$2" color="gray">
                      ~{Math.round(workout.exercises.reduce((total, ex) => 
                        total + (ex.sets * (ex.restDuration / 60)), 0
                      ))} min
                    </Text>
                  </XStack>

                  <XStack gap="$2">
                    <Button
                      flex={1}
                      icon={Play} 
                      background="$green9"
                      color="white"
                      onPress={() => {
                        // TODO: Navigate to workout execution
                        console.log('Start workout:', workout._id)
                      }}
                    >
                      Start Workout
                    </Button>
                    <Button
                      variant="outlined"
                      onPress={() => {
                        // TODO: Navigate to workout details
                        console.log('View workout:', workout._id)
                      }}
                    >
                      Details
                    </Button>
                  </XStack>
                </YStack>
              </Card>
            ))}
          </YStack>
        ) : (
          <Card p="$4">
            <YStack items="center" gap="$2">
              <Text text="center" color="gray">
                No workouts assigned yet. Your trainer will create workouts for you!
              </Text>
              <Text fontSize="$2" text="center" color="gray">
                Check back soon or contact your trainer
              </Text>
            </YStack>
          </Card>
        )}
      </YStack>
    </YStack>
  )
}
