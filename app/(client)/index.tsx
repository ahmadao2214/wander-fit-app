import { YStack, XStack, H2, Text, Card, Button, ScrollView } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useRouter } from 'expo-router'
import { 
  Play, 
  Clock, 
  Dumbbell, 
  Timer, 
  RotateCcw, 
  Eye,
  ChevronRight
} from '@tamagui/lucide-icons'

export default function ClientDashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

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
      <YStack flex={1} bg="$background">
        <YStack
          flex={1}
          items="center"
          justify="center"
          gap="$4"
          maxW={1200}
          width={"100%"}
          self="center"
          px="$4"
        >
          <Text>Loading...</Text>
        </YStack>
      </YStack>
    )
  }

  if (!user) {
    return (
      <YStack flex={1} bg="$background">
        <YStack
          flex={1}
          items="center"
          justify="center"
          gap="$4"
          maxW={1200}
          width={"100%"}
          self="center"
          px="$4"
        >
          <Text>Error loading user data</Text>
          <SignOutButton />
        </YStack>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$6"
          maxW={1200}
          width="100%"
          self="center"
          $sm={{ px: "$6" }}
          $md={{ px: "$8" }}
        >
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
            <YStack gap="$3">
              {workouts.map((workout) => {
                // Calculate estimated duration
                const estimatedDuration = Math.round(
                  workout.exercises.reduce((total, ex) => {
                    const exerciseTime = ex.duration 
                      ? ex.sets * ex.duration 
                      : ex.sets * (ex.reps || 0) * 3; // Estimate 3 seconds per rep
                    const restTime = ex.sets * ex.restDuration;
                    return total + exerciseTime + restTime;
                  }, 0) / 60
                );

                const totalSets = workout.exercises.reduce((total, ex) => total + ex.sets, 0);

                return (
                  <Card 
                    key={workout._id} 
                    p="$4" 
                    pressStyle={{ scale: 0.98 }}
                    borderColor="$borderColor"
                    onPress={() => router.push(`/(client)/workout/${workout._id}`)}
                  >
                    <YStack gap="$4">
                      {/* Workout Header */}
                      <XStack justify="space-between" items="center">
                        <YStack flex={1} gap="$1">
                          <Text fontSize="$5" fontWeight="600">
                            {workout.name}
                          </Text>
                          {workout.description && (
                            <Text fontSize="$3" color="gray" numberOfLines={2}>
                              {workout.description}
                            </Text>
                          )}
                        </YStack>
                        <ChevronRight size={20} color="gray" />
                      </XStack>

                      {/* Workout Stats */}
                      <XStack gap="$4" flexWrap="wrap">
                        <XStack items="center" gap="$2">
                          <Dumbbell size={16} color="$blue10" />
                          <Text fontSize="$3" color="gray">
                            {workout.exercises.length} exercises
                          </Text>
                        </XStack>
                        <XStack items="center" gap="$2">
                          <Timer size={16} color="$green10" />
                          <Text fontSize="$3" color="gray">
                            ~{estimatedDuration} min
                          </Text>
                        </XStack>
                        <XStack items="center" gap="$2">
                          <RotateCcw size={16} color="orange" />
                          <Text fontSize="$3" color="gray">
                            {totalSets} sets
                          </Text>
                        </XStack>
                      </XStack>

                      {/* Exercise Preview */}
                      <YStack gap="$2">
                        <Text fontSize="$3" fontWeight="600" color="gray">
                          Exercise Preview:
                        </Text>
                        <XStack gap="$2" flexWrap="wrap">
                          {workout.exercises.slice(0, 3).map((exercise, index) => (
                            <Card 
                              key={exercise.id || index} 
                              p="$2" 
                              bg="$blue1" 
                              borderColor="$blue6"
                              flex={0}
                            >
                              <Text fontSize="$2" color="$blue11">
                                {exercise.name}
                              </Text>
                            </Card>
                          ))}
                          {workout.exercises.length > 3 && (
                            <Card p="$2" backgroundColor="gray" borderColor="gray" flex={0}>
                              <Text fontSize="$2" color="gray">
                                +{workout.exercises.length - 3} more
                              </Text>
                            </Card>
                          )}
                        </XStack>
                      </YStack>

                      {/* Action Buttons */}
                      <XStack gap="$3">
                        <Button
                          flex={1}
                          icon={Play}
                          bg="$green9"
                          color="white"
                          onPress={(e) => {
                            e.stopPropagation();
                            // TODO: Navigate to workout execution
                            console.log('Start workout:', workout._id)
                            alert('Workout session feature coming soon!')
                          }}
                        >
                          Start Workout
                        </Button>
                        <Button
                          variant="outlined"
                          icon={Eye}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/(client)/workout/${workout._id}`)
                          }}
                        >
                          View Details
                        </Button>
                      </XStack>
                    </YStack>
                  </Card>
                );
              })}
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

        {/* Bottom Spacing */}
        <YStack height="$4" />
      </YStack>
      </ScrollView>
    </YStack>
  )
}
