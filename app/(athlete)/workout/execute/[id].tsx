import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  YStack, 
  XStack, 
  H2,
  Text, 
  Card, 
  Button,
  Spinner,
  AlertDialog,
  ScrollView,
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { 
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
} from '@tamagui/lucide-icons'
import { ExerciseTypeIcon } from '../../../../components/workout/ExerciseTypeIcon'
import { SetTracker } from '../../../../components/workout/SetTracker'
import { InstructionsAccordion } from '../../../../components/workout/InstructionsAccordion'
import { ExerciseQueue } from '../../../../components/workout/ExerciseQueue'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PanResponder, Platform, Vibration, Animated } from 'react-native'

/**
 * Workout Execution Screen
 * 
 * Full-screen single-exercise focus with:
 * - Progress header
 * - Exercise type icon
 * - Set tracking pills (tap to complete, long-press to edit)
 * - Instructions accordion
 * - Navigation controls
 * - Swipe drawer for exercise queue
 */

interface SetData {
  repsCompleted?: number
  durationSeconds?: number
  weight?: number
  rpe?: number
  completed: boolean
  skipped: boolean
}

interface ExerciseCompletion {
  exerciseId: Id<"exercises">
  completed: boolean
  skipped: boolean
  notes?: string
  sets: SetData[]
}

export default function WorkoutExecutionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  
  // State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseCompletions, setExerciseCompletions] = useState<ExerciseCompletion[]>([])
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([]) // Indices into template.exercises
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Auto-save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Queries
  const session = useQuery(
    api.gppWorkoutSessions.getById,
    sessionId ? { sessionId: sessionId as Id<"gpp_workout_sessions"> } : "skip"
  )

  // Mutations
  const updateProgress = useMutation(api.gppWorkoutSessions.updateProgress)
  const completeSession = useMutation(api.gppWorkoutSessions.completeSession)
  const abandonSession = useMutation(api.gppWorkoutSessions.abandonSession)

  // Refs for swipe tracking
  const currentIndexRef = useRef(currentExerciseIndex)
  const exerciseCountRef = useRef(0)

  // Keep refs in sync
  useEffect(() => {
    currentIndexRef.current = currentExerciseIndex
  }, [currentExerciseIndex])

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(15)
    }
  }, [])

  // Animation for swipe feedback
  const slideAnim = useRef(new Animated.Value(0)).current

  const animateSlide = useCallback((direction: 'left' | 'right') => {
    // Quick slide animation
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction === 'left' ? -30 : 30,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }, [slideAnim])

  // Swipe gesture handler for navigation
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState
          const swipeThreshold = 80

          if (dx > swipeThreshold && currentIndexRef.current > 0) {
            // Swipe right - go to previous
            triggerHaptic()
            animateSlide('right')
            setCurrentExerciseIndex(prev => Math.max(0, prev - 1))
          } else if (dx < -swipeThreshold && currentIndexRef.current < exerciseCountRef.current - 1) {
            // Swipe left - go to next
            triggerHaptic()
            animateSlide('left')
            setCurrentExerciseIndex(prev => Math.min(exerciseCountRef.current - 1, prev + 1))
          }
        },
      }),
    [triggerHaptic, animateSlide]
  )

  // Initialize exercise completions from session data
  useEffect(() => {
    if (session?.exercises && !isInitialized) {
      setExerciseCompletions(session.exercises as ExerciseCompletion[])
      setIsInitialized(true)
      
      // Update exercise count for swipe navigation
      if (session.template?.exercises) {
        exerciseCountRef.current = session.template.exercises.length
        
        // Restore exercise order from session if available, otherwise initialize
        if (session.exerciseOrder && session.exerciseOrder.length > 0) {
          setExerciseOrder(session.exerciseOrder)
        } else {
          // Initialize exercise order (indices 0, 1, 2, ...)
          setExerciseOrder(session.template.exercises.map((_, idx) => idx))
        }
      }
      
      // Find first incomplete exercise
      const firstIncomplete = session.exercises.findIndex(
        (e) => !e.completed && !e.skipped
      )
      if (firstIncomplete !== -1) {
        setCurrentExerciseIndex(firstIncomplete)
      }
    }
  }, [session, isInitialized])

  // Elapsed time counter
  useEffect(() => {
    if (session?.startedAt) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - session.startedAt) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [session?.startedAt])

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-save with debounce (includes exercise order for persistence)
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      if (sessionId && exerciseCompletions.length > 0) {
        try {
          await updateProgress({
            sessionId: sessionId as Id<"gpp_workout_sessions">,
            exercises: exerciseCompletions,
            exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
          })
        } catch (error) {
          console.error('Failed to save progress:', error)
        }
      }
    }, 2000) // 2 second debounce
  }, [sessionId, exerciseCompletions, exerciseOrder, updateProgress])

  // Trigger save when completions or exercise order changes
  useEffect(() => {
    if (isInitialized && exerciseCompletions.length > 0) {
      debouncedSave()
    }
  }, [exerciseCompletions, exerciseOrder, isInitialized, debouncedSave])

  // Handle set update
  const handleSetUpdate = (setIndex: number, data: SetData) => {
    setExerciseCompletions((prev) => {
      const updated = [...prev]
      const exercise = { ...updated[currentExerciseIndex] }
      exercise.sets = [...exercise.sets]
      exercise.sets[setIndex] = data
      
      // Check if all sets are completed
      const allSetsCompleted = exercise.sets.every(s => s.completed || s.skipped)
      exercise.completed = allSetsCompleted
      
      updated[currentExerciseIndex] = exercise
      return updated
    })
  }

  // Navigate to next exercise
  const goToNextExercise = async () => {
    // Save current progress first
    if (sessionId) {
      await updateProgress({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
      })
    }

    if (currentExerciseIndex < exerciseCompletions.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
    } else {
      // Last exercise - show completion dialog
      setShowCompletionDialog(true)
    }
  }

  // Navigate to previous exercise
  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
    }
  }

  // Complete the workout
  const handleCompleteWorkout = async () => {
    try {
      await completeSession({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })
      setShowCompletionDialog(false)
      // Navigate to athlete home to see updated today's workout card
      router.replace('/(athlete)')
    } catch (error) {
      console.error('Failed to complete workout:', error)
      // Even if there's an error, try to navigate back
      router.replace('/(athlete)')
    }
  }

  // Abandon the workout
  const handleAbandonWorkout = async () => {
    try {
      await abandonSession({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })
      setShowExitDialog(false)
      // Navigate back to athlete home
      router.replace('/(athlete)')
    } catch (error) {
      console.error('Failed to abandon workout:', error)
      router.replace('/(athlete)')
    }
  }

  // Handle exercise selection from queue
  const handleExerciseSelect = (index: number) => {
    setCurrentExerciseIndex(index)
  }

  // Handle exercise reorder
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (!session?.template?.exercises) return
    
    // Only allow reordering of upcoming exercises (after current)
    if (fromIndex <= currentExerciseIndex || toIndex <= currentExerciseIndex) return
    if (fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= exerciseCompletions.length || toIndex >= exerciseCompletions.length) return

    // Update exercise order
    setExerciseOrder(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })

    // Swap in exercise completions
    setExerciseCompletions(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })

    // Trigger haptic feedback
    if (Platform.OS !== 'web') {
      Vibration.vibrate(15)
    }
  }

  // Loading state
  if (!session || !session.template) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text>Loading workout...</Text>
      </YStack>
    )
  }

  const template = session.template
  const templateExercises = template.exercises || []
  
  // Get exercises in current order (using exerciseOrder for proper reordering)
  const orderedExercises = exerciseOrder.length > 0 
    ? exerciseOrder.map(idx => templateExercises[idx])
    : templateExercises
  
  const currentExercise = orderedExercises[currentExerciseIndex]
  const currentCompletion = exerciseCompletions[currentExerciseIndex]

  if (!currentExercise) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Text>No exercises found in this workout</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </YStack>
    )
  }

  const exerciseDetails = currentExercise.exercise
  const completedCount = exerciseCompletions.filter(e => e.completed).length
  const isLastExercise = currentExerciseIndex === orderedExercises.length - 1
  const isCurrentCompleted = currentCompletion?.completed

  return (
    <YStack flex={1} bg="$background" items="center">
      {/* Constrain width for web */}
      <YStack flex={1} width="100%" maxW={600}>
      {/* Header */}
      <XStack
        px="$4"
        pt={insets.top + 8}
        pb="$3"
        items="center"
        justify="space-between"
        bg="$background"
        borderBottomWidth={1}
        borderBottomColor="$gray5"
      >
        <Button
          size="$3"
          circular
          variant="outlined"
          icon={X}
          onPress={() => setShowExitDialog(true)}
        />
        
        <YStack items="center">
          <Text fontSize="$4" fontWeight="600">
              Exercise {currentExerciseIndex + 1} of {orderedExercises.length}
          </Text>
          <Text fontSize="$2" color="$color10">
            {completedCount} completed
          </Text>
        </YStack>

        <Text fontSize="$4" color="$green10" fontWeight="600">
          {formatTime(elapsedTime)}
        </Text>
      </XStack>

        {/* Main Content - with swipe gesture support */}
        <ScrollView 
          flex={1}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <YStack px="$4" py="$4" gap="$4">
        {/* Exercise Icon */}
        <YStack items="center" py="$4">
          <ExerciseTypeIcon 
            tags={exerciseDetails?.tags || []} 
            size={48}
          />
        </YStack>

        {/* Exercise Name and Prescription */}
        <YStack items="center" gap="$1">
              <H2>{exerciseDetails?.name || 'Exercise'}</H2>
          <Text fontSize="$5" color="$color10">
            {currentExercise.sets} sets × {currentExercise.reps}
          </Text>
          {currentExercise.tempo && (
            <Text fontSize="$3" color="$color9">
              Tempo: {currentExercise.tempo}
            </Text>
          )}
        </YStack>

        {/* Set Tracker */}
        {currentCompletion && (
          <Card p="$4" borderColor="$gray6" borderWidth={1}>
            <SetTracker
              sets={currentCompletion.sets}
              prescribedReps={currentExercise.reps}
              prescribedSets={currentExercise.sets}
              onSetUpdate={handleSetUpdate}
            />
          </Card>
        )}

        {/* Instructions Accordion */}
        <InstructionsAccordion
          instructions={exerciseDetails?.instructions}
          equipment={exerciseDetails?.equipment}
          notes={currentExercise.notes}
        />
      </YStack>
          </Animated.View>
        </ScrollView>

      {/* Navigation Controls */}
      <XStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        gap="$3"
        borderTopWidth={1}
        borderTopColor="$gray5"
        bg="$background"
      >
        <Button
          flex={1}
          size="$5"
          variant="outlined"
          icon={ChevronLeft}
          disabled={currentExerciseIndex === 0}
          onPress={goToPreviousExercise}
        >
          Previous
        </Button>
        
        <Button
          flex={1}
          size="$5"
          bg={isLastExercise && isCurrentCompleted ? '$green9' : '$green9'}
          color="white"
          iconAfter={isLastExercise ? Trophy : ChevronRight}
          onPress={goToNextExercise}
        >
          {isLastExercise ? 'Finish' : 'Next'}
        </Button>
      </XStack>
      </YStack>

      {/* Exercise Queue Drawer */}
      <ExerciseQueue
        exercises={orderedExercises.map((ex, idx) => ({
          exerciseId: ex.exerciseId.toString(),
          name: ex.exercise?.name || `Exercise ${idx + 1}`,
          sets: ex.sets,
          reps: ex.reps,
          completed: exerciseCompletions[idx]?.completed || false,
        }))}
        currentIndex={currentExerciseIndex}
        onExerciseSelect={handleExerciseSelect}
        onReorder={handleReorder}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
            p="$5"
            mx="$4"
          >
            <YStack gap="$3">
              <AlertDialog.Title>Exit Workout?</AlertDialog.Title>
              <AlertDialog.Description>
                Your progress will be saved. You can resume or abandon this workout later.
              </AlertDialog.Description>
              
              <XStack gap="$3" pt="$2">
                <AlertDialog.Cancel asChild>
                  <Button flex={1} variant="outlined">
                    Continue Workout
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button flex={1} bg="$red9" color="white" onPress={handleAbandonWorkout}>
                    Exit
                  </Button>
                </AlertDialog.Action>
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>

      {/* Completion Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
            p="$5"
            mx="$4"
          >
            <YStack gap="$4" items="center">
              <Card
                width={80}
                height={80}
                bg="$green3"
                borderRadius="$10"
                items="center"
                justify="center"
                borderWidth={0}
              >
                <Trophy size={40} color="$green10" />
              </Card>
              
              <AlertDialog.Title>
                Workout Complete!
              </AlertDialog.Title>
              
              <YStack items="center" gap="$1">
                <Text fontSize="$5" fontWeight="700" color="$green10">
                  {formatTime(elapsedTime)}
                </Text>
                <Text color="$color10">
                  {completedCount} of {orderedExercises.length} exercises completed
                </Text>
              </YStack>
              
              <Button 
                width="100%"
                size="$5"
                bg="$green9" 
                color="white" 
                icon={Check}
                onPress={handleCompleteWorkout}
              >
                Done
              </Button>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  )
}
