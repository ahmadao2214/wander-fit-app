import { useState } from 'react'
import { 
  YStack, 
  XStack, 
  H2, 
  H3,
  Text, 
  Card, 
  Button,
  ScrollView,
  Spinner 
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { 
  ArrowLeft, 
  Play, 
  Dumbbell,
  Timer,
  RotateCcw,
  Info 
} from '@tamagui/lucide-icons'

export default function WorkoutDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  // Get workout details
  const workout = useQuery(
    api.workouts.getWorkoutById,
    id ? { workoutId: id as any } : "skip"
  )

  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Please log in to view workouts</Text>
      </YStack>
    )
  }

  if (!workout) {
    return (
      <YStack flex={1} bg="$background">
        <YStack
          flex={1}
          items="center"
          justify="center"
          gap="$4"
          maxW={800}
          width="100%"
          self="center"
          px="$4"
        >
          <Spinner size="large" />
          <Text>Loading workout...</Text>
        </YStack>
      </YStack>
    )
  }

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

  const startWorkout = () => {
    // TODO: Navigate to workout execution
    console.log('Starting workout:', workout._id)
    // For now, just show an alert
    alert('Workout session feature coming soon!')
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$6"
          maxW={800}
          width="100%"
          self="center"
          $sm={{ px: "$6" }}
          $md={{ px: "$8" }}
        >
          {/* Header */}
          <XStack items="center" gap="$3">
            <Button
              size="$3"
              variant="outlined"
              icon={ArrowLeft}
              onPress={() => router.back()}
              circular
            />
            <YStack flex={1}>
              <H2>{workout.name}</H2>
              <Text color="gray">
                {workout.exercises.length} exercises • ~{estimatedDuration} min
              </Text>
            </YStack>
          </XStack>

          {/* Description */}
          {workout.description && (
            <Card p="$4" bg="$blue1" borderColor="$blue6">
              <XStack items="center" gap="$3">
                <Info size={20} color="$blue11" />
                <YStack flex={1}>
                  <Text fontWeight="600" color="$blue11" fontSize="$3">
                    Workout Description
                  </Text>
                  <Text color="$blue11" fontSize="$3">
                    {workout.description}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Start Workout Button */}
          <Card p="$4">
            <Button
              bg="$green9"
              color="white"
              size="$5"
              onPress={startWorkout}
              icon={Play}
            >
              Start Workout
            </Button>
          </Card>

          {/* Exercise List */}
          <YStack gap="$3">
            <H3>Exercises</H3>
            
            {workout.exercises.map((exercise, index) => (
              <Card key={exercise.id || index} p="$4" borderColor="$borderColor">
                <YStack gap="$3">
                  {/* Exercise Header */}
                  <XStack items="center" gap="$3">
                    <YStack
                      width={32}
                      height={32}
                      bg="$blue9"
                      rounded="$3"
                      items="center"
                      justify="center"
                    >
                      <Text color="white" fontWeight="600" fontSize="$3">
                        {index + 1}
                      </Text>
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$5" fontWeight="600">
                        {exercise.name}
                      </Text>
                    </YStack>
                  </XStack>

                  {/* Exercise Details */}
                  <XStack gap="$4" flexWrap="wrap">
                    <XStack items="center" gap="$2">
                      <Dumbbell size={16} color="gray" />
                      <Text fontSize="$3" color="gray">
                        {exercise.sets} sets
                      </Text>
                    </XStack>
                    
                    {exercise.reps && (
                      <XStack items="center" gap="$2">
                        <Text fontSize="$3" color="gray">
                          {exercise.reps} reps
                        </Text>
                      </XStack>
                    )}
                    
                    {exercise.duration && (
                      <XStack items="center" gap="$2">
                        <Timer size={16} color="gray" />
                        <Text fontSize="$3" color="gray">
                          {exercise.duration}s
                        </Text>
                      </XStack>
                    )}
                    
                    <XStack items="center" gap="$2">
                      <RotateCcw size={16} color="gray" />
                      <Text fontSize="$3" color="gray">
                        {exercise.restDuration}s rest
                      </Text>
                    </XStack>
                  </XStack>

                  {/* Exercise Notes */}
                  {exercise.notes && (
                    <Card p="$3" bg="$yellow1" borderColor="$yellow6">
                      <XStack items="center" gap="$2">
                        <Info size={14} color="$yellow11" />
                        <Text fontSize="$2" color="$yellow11">
                          <Text fontWeight="600">Note:</Text> {exercise.notes}
                        </Text>
                      </XStack>
                    </Card>
                  )}

                  {/* Exercise Summary */}
                  <YStack gap="$1" background="$gray2" p="$3" rounded="$3">
                    <Text fontSize="$2" color="gray" fontWeight="600">
                      Exercise Summary:
                    </Text>
                    {exercise.reps ? (
                      <Text fontSize="$2" color="gray">
                        • {exercise.sets} sets of {exercise.reps} reps
                      </Text>
                    ) : (
                      <Text fontSize="$2" color="gray">
                        • {exercise.sets} sets of {exercise.duration}s each
                      </Text>
                    )}
                    <Text fontSize="$2" color="gray">
                      • {exercise.restDuration}s rest between sets
                    </Text>
                    <Text fontSize="$2" color="gray">
                      • Estimated time: ~{Math.round(
                        (exercise.duration 
                          ? exercise.sets * exercise.duration 
                          : exercise.sets * (exercise.reps || 0) * 3) + 
                        (exercise.sets * exercise.restDuration)
                      ) / 60} minutes
                    </Text>
                  </YStack>
                </YStack>
              </Card>
            ))}
          </YStack>

          {/* Workout Summary */}
          <Card p="$4" bg="$green1" borderColor="$green6">
            <YStack gap="$3">
              <Text fontWeight="600" color="$green11" fontSize="$4">
                Workout Summary
              </Text>
              <YStack gap="$1">
                <Text fontSize="$3" color="$green11">
                  • {workout.exercises.length} exercises total
                </Text>
                <Text fontSize="$3" color="$green11">
                  • {workout.exercises.reduce((total, ex) => total + ex.sets, 0)} total sets
                </Text>
                <Text fontSize="$3" color="$green11">
                  • Estimated duration: ~{estimatedDuration} minutes
                </Text>
                <Text fontSize="$3" color="$green11">
                  • Focus areas: {workout.exercises.slice(0, 3).map(ex => ex.name).join(', ')}
                  {workout.exercises.length > 3 && '...'}
                </Text>
              </YStack>
            </YStack>
          </Card>

          {/* Bottom Action */}
          <Card p="$4">
            <Button
              bg="$green9"
              color="white"
              size="$5"
              onPress={startWorkout}
              icon={Play}
            >
              Ready? Start Workout
            </Button>
          </Card>

          {/* Bottom Spacing */}
          <YStack height="$4" />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
