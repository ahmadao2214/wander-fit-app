import { useState } from 'react'
import { 
  YStack, 
  XStack, 
  H2, 
  H3,
  Text, 
  Input, 
  Button, 
  Card, 
  ScrollView,
  Spinner,
  Select,
  Adapt,
  Sheet
} from 'tamagui'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Dumbbell,
  Timer,
  RotateCcw 
} from '@tamagui/lucide-icons'

interface Exercise {
  id: string
  name: string
  sets: number
  reps?: number
  duration?: number
  restDuration: number
  notes?: string
}

export default function CreateWorkoutScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const createWorkout = useMutation(api.workouts.createWorkout)
  
  // Get trainer's clients
  const clients = useQuery(
    api.users.getTrainerClients,
    user ? { trainerId: user._id } : "skip"
  )

  // Workout form state
  const [workoutName, setWorkoutName] = useState('')
  const [workoutDescription, setWorkoutDescription] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  
  // Exercise form state
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showExerciseForm, setShowExerciseForm] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseSets, setExerciseSets] = useState('3')
  const [exerciseReps, setExerciseReps] = useState('10')
  const [exerciseDuration, setExerciseDuration] = useState('')
  const [exerciseRest, setExerciseRest] = useState('60')
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [exerciseType, setExerciseType] = useState<'reps' | 'duration'>('reps')
  
  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resetExerciseForm = () => {
    setExerciseName('')
    setExerciseSets('3')
    setExerciseReps('10')
    setExerciseDuration('')
    setExerciseRest('60')
    setExerciseNotes('')
    setExerciseType('reps')
  }

  const addExercise = () => {
    if (!exerciseName.trim()) {
      setError('Exercise name is required')
      return
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      sets: parseInt(exerciseSets) || 3,
      reps: exerciseType === 'reps' ? parseInt(exerciseReps) || 10 : undefined,
      duration: exerciseType === 'duration' ? parseInt(exerciseDuration) || 30 : undefined,
      restDuration: parseInt(exerciseRest) || 60,
      notes: exerciseNotes.trim() || undefined,
    }

    setExercises([...exercises, exercise])
    resetExerciseForm()
    setShowExerciseForm(false)
    setError('')
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id))
  }

  const createWorkoutHandler = async () => {
    if (!workoutName.trim()) {
      setError('Workout name is required')
      return
    }
    
    if (!selectedClientId) {
      setError('Please select a client')
      return
    }
    
    if (exercises.length === 0) {
      setError('Please add at least one exercise')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await createWorkout({
        name: workoutName.trim(),
        description: workoutDescription.trim() || undefined,
        clientId: selectedClientId as any,
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          restDuration: ex.restDuration,
          notes: ex.notes,
        }))
      })

      // Success - navigate back
      router.back()
    } catch (err) {
      console.error('Error creating workout:', err)
      setError('Failed to create workout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Please log in to create workouts</Text>
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
              <H2>Create Workout</H2>
              <Text color="gray">
                Design a custom workout for your client
              </Text>
            </YStack>
          </XStack>

          {/* Error Message */}
          {error && (
            <Card p="$3" bg="$red2" borderColor="$red8">
              <Text color="$red11" fontSize="$3">
                {error}
              </Text>
            </Card>
          )}

          {/* Workout Details */}
          <Card p="$4">
            <YStack gap="$4">
              <H3>Workout Details</H3>
              
              {/* Workout Name */}
              <YStack gap="$2">
                <Text fontWeight="500">Workout Name</Text>
                <Input
                  placeholder="e.g. Upper Body Strength"
                  value={workoutName}
                  onChangeText={setWorkoutName}
                  size="$4"
                />
              </YStack>

              {/* Workout Description */}
              <YStack gap="$2">
                <Text fontWeight="500">Description (Optional)</Text>
                <Input
                  placeholder="e.g. Focus on chest, shoulders, and triceps"
                  value={workoutDescription}
                  onChangeText={setWorkoutDescription}
                  size="$4"
                  multiline
                  numberOfLines={3}
                />
              </YStack>

              {/* Client Selection */}
              <YStack gap="$2">
                <Text fontWeight="500">Assign to Client</Text>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <Select.Trigger width="100%" iconAfter={<></>}>
                    <Select.Value placeholder="Select a client" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet modal dismissOnSnapToBottom>
                      <Sheet.Frame>
                        <Sheet.ScrollView>
                          <Adapt.Contents />
                        </Sheet.ScrollView>
                      </Sheet.Frame>
                      <Sheet.Overlay />
                    </Sheet>
                  </Adapt>

                  <Select.Content zIndex={200000}>
                    <Select.ScrollUpButton />
                    <Select.Viewport>
                      <Select.Group>
                        {clients?.map((client, index) => (
                          <Select.Item
                            index={index}
                            key={client._id}
                            value={client._id?.toString() || ''}
                          >
                            <Select.ItemText>{client.name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                    <Select.ScrollDownButton />
                  </Select.Content>
                </Select>
              </YStack>
            </YStack>
          </Card>

          {/* Exercises Section */}
          <Card p="$4">
            <YStack gap="$4">
              <XStack justify="space-between" items="center">
                <H3>Exercises ({exercises.length})</H3>
                <Button
                  size="$3"
                  bg="$blue9"
                  color="white"
                  icon={Plus}
                  onPress={() => setShowExerciseForm(true)}
                >
                  Add Exercise
                </Button>
              </XStack>

              {/* Exercise List */}
              {exercises.length > 0 ? (
                <YStack gap="$3">
                  {exercises.map((exercise, index) => (
                    <Card key={exercise.id} p="$3" borderColor="$borderColor">
                      <XStack justify="space-between" items="center">
                        <YStack flex={1} gap="$1">
                          <XStack items="center" gap="$2">
                            <Text fontWeight="600" fontSize="$4">
                              {index + 1}. {exercise.name}
                            </Text>
                          </XStack>
                          <XStack gap="$4" flexWrap="wrap">
                            <XStack items="center" gap="$1">
                              <Dumbbell size={14} color="gray" />
                              <Text fontSize="$2" color="gray">
                                {exercise.sets} sets
                              </Text>
                            </XStack>
                            {exercise.reps && (
                              <XStack items="center" gap="$1">
                                <Text fontSize="$2" color="gray">
                                  {exercise.reps} reps
                                </Text>
                              </XStack>
                            )}
                            {exercise.duration && (
                              <XStack items="center" gap="$1">
                                <Timer size={14} color="gray" />
                                <Text fontSize="$2" color="gray">
                                  {exercise.duration}s
                                </Text>
                              </XStack>
                            )}
                            <XStack items="center" gap="$1">
                              <RotateCcw size={14} color="gray" />
                              <Text fontSize="$2" color="gray">
                                {exercise.restDuration}s rest
                              </Text>
                            </XStack>
                          </XStack>
                          {exercise.notes && (
                            <Text fontSize="$2" color="gray">
                              Notes: {exercise.notes}
                            </Text>
                          )}
                        </YStack>
                        <Button
                          size="$2"
                          variant="outlined"
                          color="$red10"
                          icon={Trash2}
                          onPress={() => removeExercise(exercise.id)}
                        />
                      </XStack>
                    </Card>
                  ))}
                </YStack>
              ) : (
                <Card p="$4" backgroundColor="gray" borderColor="gray">
                  <YStack items="center" gap="$2">
                    <Text color="gray">
                      No exercises added yet
                    </Text>
                    <Text fontSize="$2" color="gray">
                      Add exercises to build your workout
                    </Text>
                  </YStack>
                </Card>
              )}

              {/* Exercise Form */}
              {showExerciseForm && (
                <Card p="$4" bg="$blue1" borderColor="$blue6">
                  <YStack gap="$4">
                    <XStack justify="space-between" items="center">
                      <Text fontWeight="600" fontSize="$4">Add Exercise</Text>
                      <Button
                        size="$2"
                        variant="outlined"
                        onPress={() => {
                          setShowExerciseForm(false)
                          resetExerciseForm()
                        }}
                      >
                        Cancel
                      </Button>
                    </XStack>

                    {/* Exercise Name */}
                    <YStack gap="$2">
                      <Text fontWeight="500">Exercise Name</Text>
                      <Input
                        placeholder="e.g. Push-ups, Bench Press, Squats"
                        value={exerciseName}
                        onChangeText={setExerciseName}
                        size="$4"
                      />
                    </YStack>

                    {/* Exercise Type Toggle */}
                    <YStack gap="$2">
                      <Text fontWeight="500">Exercise Type</Text>
                      <XStack gap="$2">
                        <Button
                          flex={1}
                          variant={exerciseType === 'reps' ? undefined : 'outlined'}
                          onPress={() => setExerciseType('reps')}
                        >
                          Reps-based
                        </Button>
                        <Button
                          flex={1}
                          variant={exerciseType === 'duration' ? undefined : 'outlined'}
                          onPress={() => setExerciseType('duration')}
                        >
                          Time-based
                        </Button>
                      </XStack>
                    </YStack>

                    <XStack gap="$3">
                      {/* Sets */}
                      <YStack gap="$2" flex={1}>
                        <Text fontWeight="500">Sets</Text>
                        <Input
                          placeholder="3"
                          value={exerciseSets}
                          onChangeText={setExerciseSets}
                          keyboardType="numeric"
                          size="$4"
                        />
                      </YStack>

                      {/* Reps or Duration */}
                      {exerciseType === 'reps' ? (
                        <YStack gap="$2" flex={1}>
                          <Text fontWeight="500">Reps</Text>
                          <Input
                            placeholder="10"
                            value={exerciseReps}
                            onChangeText={setExerciseReps}
                            keyboardType="numeric"
                            size="$4"
                          />
                        </YStack>
                      ) : (
                        <YStack gap="$2" flex={1}>
                          <Text fontWeight="500">Duration (seconds)</Text>
                          <Input
                            placeholder="30"
                            value={exerciseDuration}
                            onChangeText={setExerciseDuration}
                            keyboardType="numeric"
                            size="$4"
                          />
                        </YStack>
                      )}

                      {/* Rest Duration */}
                      <YStack gap="$2" flex={1}>
                        <Text fontWeight="500">Rest (seconds)</Text>
                        <Input
                          placeholder="60"
                          value={exerciseRest}
                          onChangeText={setExerciseRest}
                          keyboardType="numeric"
                          size="$4"
                        />
                      </YStack>
                    </XStack>

                    {/* Exercise Notes */}
                    <YStack gap="$2">
                      <Text fontWeight="500">Notes (Optional)</Text>
                      <Input
                        placeholder="e.g. Focus on form, go slow on the negative"
                        value={exerciseNotes}
                        onChangeText={setExerciseNotes}
                        size="$4"
                        multiline
                        numberOfLines={2}
                      />
                    </YStack>

                    <Button
                      bg="$green9"
                      color="white"
                      onPress={addExercise}
                      icon={Plus}
                    >
                      Add Exercise
                    </Button>
                  </YStack>
                </Card>
              )}
            </YStack>
          </Card>

          {/* Create Workout Button */}
          <Card p="$4">
            <Button
              bg="$blue9"
              color="white"
              size="$5"
              onPress={createWorkoutHandler}
              disabled={isLoading || !workoutName || !selectedClientId || exercises.length === 0}
              icon={isLoading ? Spinner : Dumbbell}
            >
              {isLoading ? 'Creating Workout...' : 'Create Workout'}
            </Button>
          </Card>

          {/* Bottom Spacing */}
          <YStack height="$4" />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
