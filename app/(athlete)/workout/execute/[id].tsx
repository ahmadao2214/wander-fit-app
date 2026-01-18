import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Spinner,
  AlertDialog,
  ScrollView,
  styled,
  Theme,
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
  Zap,
  Flame,
  Timer,
} from '@tamagui/lucide-icons'
import { ExerciseTypeIcon } from '../../../../components/workout/ExerciseTypeIcon'
import { SetTracker } from '../../../../components/workout/SetTracker'
import { InstructionsAccordion } from '../../../../components/workout/InstructionsAccordion'
import { ExerciseQueue } from '../../../../components/workout/ExerciseQueue'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PanResponder, Platform, Vibration, Animated, useColorScheme } from 'react-native'
import { mapIntensityToLevel, IntensityLevel } from '../../../../lib'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
  text: 'center',
})

const TimerDisplay = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: 18,
  letterSpacing: 0.5,
})

// ─────────────────────────────────────────────────────────────────────────────
// INTENSITY BADGE
// ─────────────────────────────────────────────────────────────────────────────

interface IntensityBadgeProps {
  intensity: IntensityLevel
  size?: 'small' | 'large'
}

function IntensityBadge({ intensity, size = 'small' }: IntensityBadgeProps) {
  const configs = {
    low: { 
      bg: '$intensityLow6' as const, 
      label: 'LOW INTENSITY', 
      icon: Zap,
      description: 'Recovery session'
    },
    medium: { 
      bg: '$intensityMed6' as const, 
      label: 'MODERATE', 
      icon: Zap,
      description: 'Building effort'
    },
    high: { 
      bg: '$intensityHigh6' as const, 
      label: 'HIGH INTENSITY', 
      icon: Flame,
      description: 'Peak effort'
    },
  }
  const config = configs[intensity]

  if (size === 'large') {
    return (
      <XStack 
        bg={config.bg} 
        px="$3" 
        py="$2" 
        rounded="$3" 
        items="center" 
        gap="$2"
      >
        <config.icon size={16} color="white" />
        <YStack>
          <Text color="white" fontSize={12} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>
            {config.label}
          </Text>
          <Text color="rgba(255,255,255,0.8)" fontSize={10} fontFamily="$body">
            {config.description}
          </Text>
        </YStack>
      </XStack>
    )
  }

  return (
    <XStack 
      bg={config.bg} 
      px="$2" 
      py="$1" 
      rounded="$2" 
      items="center" 
      gap="$1"
    >
      <config.icon size={12} color="white" />
      <Text color="white" fontSize={10} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>
        {config.label}
      </Text>
    </XStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Workout Execution Screen
 * 
 * Full-screen single-exercise focus with:
 * - Progress header with timer
 * - Exercise type icon
 * - Set tracking pills (tap to complete, long-press to edit)
 * - Instructions accordion
 * - Navigation controls
 * - Swipe drawer for exercise queue
 * - Intensity-based theming (green/yellow/red)
 */
export default function WorkoutExecutionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  
  // State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseCompletions, setExerciseCompletions] = useState<ExerciseCompletion[]>([])
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([])
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Auto-advance state (1.5s delay when all sets complete)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if session has been completed/abandoned to prevent save attempts
  const sessionEndedRef = useRef(false)

  // Queries
  const session = useQuery(
    api.gppWorkoutSessions.getById,
    sessionId ? { sessionId: sessionId as Id<"gpp_workout_sessions"> } : "skip"
  )

  // Get last completed session for comparison hints
  const lastCompletedSession = useQuery(
    api.gppWorkoutSessions.getLastCompletedSessionForTemplate,
    session?.templateId ? { templateId: session.templateId } : "skip"
  )

  // Mutations
  const updateProgress = useMutation(api.gppWorkoutSessions.updateProgress)
  const completeSession = useMutation(api.gppWorkoutSessions.completeSession)
  const abandonSession = useMutation(api.gppWorkoutSessions.abandonSession)

  // Refs for swipe tracking
  const currentIndexRef = useRef(currentExerciseIndex)
  const exerciseCountRef = useRef(0)

  // Map backend intensity to frontend IntensityLevel
  const intensity = useMemo(
    () => mapIntensityToLevel(session?.targetIntensity),
    [session?.targetIntensity]
  )
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Intensity-based colors
  // In dark mode, the scale is inverted (1-6 dark, 7-12 light)
  // For backgrounds, we use level 3 in dark mode for visibility, level 2 in light mode
  const intensityColorMap = {
    low: {
      primary: '$intensityLow6',
      light: isDark ? '$intensityLow3' : '$intensityLow2',
      text: '$intensityLow11',
    },
    medium: {
      primary: '$intensityMed6',
      light: isDark ? '$intensityMed3' : '$intensityMed2',
      text: '$intensityMed11',
    },
    high: {
      primary: '$intensityHigh6',
      light: isDark ? '$intensityHigh3' : '$intensityHigh2',
      text: '$intensityHigh11',
    },
  } as const
  const intensityColors = intensityColorMap[intensity]

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

  // Cancel any pending auto-advance
  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setAutoAdvanceCountdown(null)
  }, [])

  // Animation for swipe feedback
  const slideAnim = useRef(new Animated.Value(0)).current

  const animateSlide = useCallback((direction: 'left' | 'right') => {
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

  // Swipe gesture handler
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState
          const swipeThreshold = 80

          if (dx > swipeThreshold && currentIndexRef.current > 0) {
            triggerHaptic()
            animateSlide('right')
            setCurrentExerciseIndex(prev => Math.max(0, prev - 1))
          } else if (dx < -swipeThreshold && currentIndexRef.current < exerciseCountRef.current - 1) {
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
      
      if (session.template?.exercises) {
        exerciseCountRef.current = session.template.exercises.length
        
        if (session.exerciseOrder && session.exerciseOrder.length > 0) {
          setExerciseOrder(session.exerciseOrder)
        } else {
          setExerciseOrder(session.template.exercises.map((_, idx) => idx))
        }
      }
      
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

  // Auto-save with debounce
  const debouncedSave = useCallback(() => {
    // Don't schedule save if session has already ended
    if (sessionEndedRef.current) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check session hasn't ended while timeout was waiting
      if (sessionEndedRef.current) return

      if (sessionId && exerciseCompletions.length > 0) {
        try {
          await updateProgress({
            sessionId: sessionId as Id<"gpp_workout_sessions">,
            exercises: exerciseCompletions,
            exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
          })
        } catch (error) {
          // Silently ignore "already completed/abandoned" errors - this is expected
          // when the user completes the workout while a save was pending
          const errorMessage = String(error)
          if (!errorMessage.includes('completed or abandoned')) {
            console.error('Failed to save progress:', error)
          }
        }
      }
    }, 2000)
  }, [sessionId, exerciseCompletions, exerciseOrder, updateProgress])

  useEffect(() => {
    // Don't trigger saves if session has ended
    if (sessionEndedRef.current) return

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

      const allSetsCompleted = exercise.sets.every(s => s.completed || s.skipped)
      exercise.completed = allSetsCompleted

      // Trigger auto-advance if all sets complete and not last exercise
      if (allSetsCompleted && currentExerciseIndex < updated.length - 1) {
        // Start countdown (1.5 seconds = 1500ms)
        setAutoAdvanceCountdown(1.5)

        // Update countdown every 100ms for smooth animation
        countdownIntervalRef.current = setInterval(() => {
          setAutoAdvanceCountdown(prev => {
            if (prev === null || prev <= 0.1) {
              return null
            }
            return Math.round((prev - 0.1) * 10) / 10
          })
        }, 100)

        // Auto-advance after 1.5 seconds
        autoAdvanceRef.current = setTimeout(() => {
          cancelAutoAdvance()
          triggerHaptic()
          animateSlide('left')
          setCurrentExerciseIndex(prevIdx => Math.min(updated.length - 1, prevIdx + 1))
        }, 1500)
      }

      updated[currentExerciseIndex] = exercise
      return updated
    })
  }

  // Clean up auto-advance on exercise change or unmount
  useEffect(() => {
    return () => {
      cancelAutoAdvance()
    }
  }, [cancelAutoAdvance])

  // Clean up save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [])

  // Cancel auto-advance when manually navigating
  useEffect(() => {
    cancelAutoAdvance()
  }, [currentExerciseIndex, cancelAutoAdvance])

  // Navigate to next exercise
  const goToNextExercise = async () => {
    if (sessionId) {
      await updateProgress({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
      })
    }

    if (currentExerciseIndex < exerciseCompletions.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
    } else {
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
    // Mark session as ended to prevent further auto-saves
    sessionEndedRef.current = true
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    try {
      await completeSession({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })
      setShowCompletionDialog(false)
      router.replace('/(athlete)')
    } catch (error) {
      console.error('Failed to complete workout:', error)
      router.replace('/(athlete)')
    }
  }

  // Abandon the workout
  const handleAbandonWorkout = async () => {
    // Mark session as ended to prevent further auto-saves
    sessionEndedRef.current = true
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    try {
      await abandonSession({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: exerciseCompletions,
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })
      setShowExitDialog(false)
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
    
    if (fromIndex <= currentExerciseIndex || toIndex <= currentExerciseIndex) return
    if (fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= exerciseCompletions.length || toIndex >= exerciseCompletions.length) return

    setExerciseOrder(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })

    setExerciseCompletions(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })

    if (Platform.OS !== 'web') {
      Vibration.vibrate(15)
    }
  }

  // Derived values (must be before early returns to maintain hook order)
  const template = session?.template
  const templateExercises = template?.exercises || []

  const orderedExercises = exerciseOrder.length > 0
    ? exerciseOrder.map(idx => templateExercises[idx])
    : templateExercises

  const currentExercise = orderedExercises[currentExerciseIndex]
  const currentCompletion = exerciseCompletions[currentExerciseIndex]

  // Get previous performance for current exercise (if available)
  const previousSetsForCurrentExercise = useMemo(() => {
    if (!lastCompletedSession?.exercises || !currentExercise) return undefined
    const previousExercise = lastCompletedSession.exercises.find(
      (ex) => String(ex.exerciseId) === currentExercise.exerciseId
    )
    if (!previousExercise?.sets) return undefined
    return previousExercise.sets.map((set) => ({
      repsCompleted: set.repsCompleted,
      weight: set.weight,
      completed: set.completed,
      skipped: set.skipped,
    }))
  }, [lastCompletedSession, currentExercise])

  // Loading state
  if (!session || !template) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text fontFamily="$body" color="$color10">Loading workout...</Text>
      </YStack>
    )
  }

  if (!currentExercise) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Text fontFamily="$body">No exercises found in this workout</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </YStack>
    )
  }

  const exerciseDetails = currentExercise.exercise
  const completedCount = exerciseCompletions.filter(e => e.completed).length
  const isLastExercise = currentExerciseIndex === orderedExercises.length - 1

  return (
    <YStack flex={1} bg="$background" items="center">
      {/* Constrain width for web */}
      <YStack flex={1} width="100%" maxW={600}>
        {/* Header with intensity-colored accent */}
        <YStack>
          {/* Intensity color bar */}
          <YStack height={4} bg={intensityColors.primary} />

          <XStack
            px="$4"
            pt={insets.top + 8}
            pb="$3"
            items="center"
            justify="space-between"
            bg="$surface"
          >
            <Button
              size="$3"
              circular
              bg="$background"
              borderWidth={1}
              borderColor="$borderColor"
              icon={X}
              pressStyle={{ opacity: 0.8 }}
              onPress={() => setShowExitDialog(true)}
            />

            {/* Dot Stepper Progress */}
            <XStack items="center" gap="$1.5">
              {orderedExercises.map((_, idx) => {
                const isCompleted = exerciseCompletions[idx]?.completed
                const isCurrent = idx === currentExerciseIndex
                return (
                  <YStack
                    key={idx}
                    width={isCurrent ? 10 : 8}
                    height={isCurrent ? 10 : 8}
                    rounded={100}
                    bg={isCompleted ? intensityColors.primary : isCurrent ? 'transparent' : '$color5'}
                    borderWidth={isCurrent ? 2 : 0}
                    borderColor={isCurrent ? intensityColors.primary : undefined}
                  />
                )
              })}
            </XStack>

            <XStack items="center" gap="$1.5">
              <Timer size={16} color={intensityColors.primary} />
              <TimerDisplay color={intensityColors.primary}>
                {formatTime(elapsedTime)}
              </TimerDisplay>
            </XStack>
          </XStack>
        </YStack>

        {/* Main Content */}
        <ScrollView 
          flex={1}
          showsVerticalScrollIndicator={false}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <YStack px="$4" py="$5" gap="$5">
              {/* Exercise Icon */}
              <YStack items="center" py="$3">
                <YStack 
                  bg={intensityColors.light} 
                  p="$4" 
                  rounded="$10"
                >
                  <ExerciseTypeIcon 
                    tags={exerciseDetails?.tags || []} 
                    size={48}
                    color={intensityColors.primary}
                  />
                </YStack>
              </YStack>

              {/* Exercise Name and Prescription */}
              <YStack items="center" gap="$3">
                <DisplayHeading>
                  {exerciseDetails?.name?.toUpperCase() || 'EXERCISE'}
                </DisplayHeading>

                {/* Prominent sets x reps badge */}
                <XStack
                  bg="$color3"
                  px="$4"
                  py="$2.5"
                  rounded="$4"
                  items="center"
                  gap="$2"
                >
                  <Text
                    fontSize={18}
                    fontFamily="$body"
                    fontWeight="700"
                    color="$color12"
                  >
                    {currentExercise.scaledSets ?? currentExercise.sets} sets
                  </Text>
                  <Text fontSize={16} color="$color9" fontFamily="$body">
                    ×
                  </Text>
                  <Text
                    fontSize={18}
                    fontFamily="$body"
                    fontWeight="700"
                    color="$color12"
                  >
                    {currentExercise.scaledReps ?? currentExercise.reps}
                  </Text>
                </XStack>

                {currentExercise.tempo && (
                  <Text fontSize={14} color="$color9" fontFamily="$body">
                    {currentExercise.tempo} tempo
                  </Text>
                )}
                {/* TODO: Add targetWeight display when schema is updated */}
              </YStack>

              {/* Set Tracker */}
              {currentCompletion && (
                <SetTracker
                  sets={currentCompletion.sets}
                  prescribedReps={currentExercise.scaledReps ?? currentExercise.reps}
                  prescribedSets={currentExercise.scaledSets ?? currentExercise.sets}
                  onSetUpdate={handleSetUpdate}
                  intensityColor={intensityColors.primary}
                  intensityLightColor={intensityColors.light}
                  previousSets={previousSetsForCurrentExercise}
                />
              )}

              {/* Auto-advance indicator */}
              {autoAdvanceCountdown !== null && (
                <XStack
                  items="center"
                  justify="center"
                  gap="$2"
                  bg={intensityColors.light}
                  px="$4"
                  py="$3"
                  rounded="$3"
                  borderWidth={1}
                  borderColor={intensityColors.primary}
                >
                  <YStack
                    width={20}
                    height={20}
                    rounded="$10"
                    bg={intensityColors.primary}
                    items="center"
                    justify="center"
                  >
                    <ChevronRight size={14} color="white" />
                  </YStack>
                  <Text
                    fontFamily="$body"
                    fontWeight="600"
                    color={intensityColors.text}
                    fontSize={14}
                  >
                    Next exercise in {autoAdvanceCountdown.toFixed(1)}s
                  </Text>
                  <Button
                    size="$2"
                    bg="transparent"
                    color={intensityColors.text}
                    onPress={cancelAutoAdvance}
                    fontFamily="$body"
                    px="$2"
                  >
                    Cancel
                  </Button>
                </XStack>
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
          py="$2"
          gap="$3"
          bg="$surface"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            flex={1}
            size="$5"
            bg="$background"
            borderWidth={2}
            borderColor="$borderColor"
            icon={ChevronLeft}
            disabled={currentExerciseIndex === 0}
            opacity={currentExerciseIndex === 0 ? 0.5 : 1}
            fontFamily="$body" fontWeight="700"
            color="$color11"
            rounded="$4"
            onPress={goToPreviousExercise}
          >
            Previous
          </Button>
          
          <Button
            flex={1}
            size="$5"
            bg={intensityColors.primary}
            color="white"
            iconAfter={isLastExercise ? Trophy : ChevronRight}
            fontFamily="$body" fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
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
          scaledSets: ex.scaledSets,
          scaledReps: ex.scaledReps,
          completed: exerciseCompletions[idx]?.completed || false,
        }))}
        currentIndex={currentExerciseIndex}
        onExerciseSelect={handleExerciseSelect}
        onReorder={handleReorder}
        intensityColor={intensityColors.primary}
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
            bg="$surface"
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
            rounded="$5"
          >
            <YStack gap="$3">
              <AlertDialog.Title fontFamily="$body" fontWeight="700" fontSize={20}>
                Exit Workout?
              </AlertDialog.Title>
              <AlertDialog.Description fontFamily="$body" color="$color10">
                Your progress will be saved. You can resume this workout later.
              </AlertDialog.Description>
              
              <XStack gap="$3" pt="$2">
                <AlertDialog.Cancel asChild>
                  <Button 
                    flex={1} 
                    bg="$background"
                    borderWidth={2}
                    borderColor="$borderColor"
                    fontFamily="$body" fontWeight="700"
                    color="$color11"
                    rounded="$4"
                  >
                    Continue
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button 
                    flex={1} 
                    bg="$error" 
                    color="white" 
                    fontFamily="$body" fontWeight="700"
                    rounded="$4"
                    onPress={handleAbandonWorkout}
                  >
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
            bg="$surface"
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
            p="$6"
            mx="$4"
            rounded="$5"
          >
            <YStack gap="$5" items="center">
              <YStack
                width={80}
                height={80}
                bg="$success"
                rounded="$10"
                items="center"
                justify="center"
              >
                <Trophy size={40} color="white" />
              </YStack>
              
              <YStack items="center" gap="$1">
                <Text 
                  fontFamily="$heading" 
                  fontSize={32} 
                  letterSpacing={1}
                  color="$color12"
                >
                  WORKOUT COMPLETE!
                </Text>
                <Text fontFamily="$body" color="$color10">
                  Great work today
                </Text>
              </YStack>
              
              <XStack gap="$6">
                <YStack items="center">
                  <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$primary">
                    {formatTime(elapsedTime)}
                  </Text>
                  <Text fontSize={12} color="$color10" fontFamily="$body">
                    Duration
                  </Text>
                </YStack>
                <YStack items="center">
                  <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$success">
                    {completedCount}/{orderedExercises.length}
                  </Text>
                  <Text fontSize={12} color="$color10" fontFamily="$body">
                    Exercises
                  </Text>
                </YStack>
                <YStack items="center">
                  <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$color11">
                    {exerciseCompletions.reduce((total, ex) =>
                      total + ex.sets.filter(s => s.completed && !s.skipped).length, 0
                    )}
                  </Text>
                  <Text fontSize={12} color="$color10" fontFamily="$body">
                    Sets
                  </Text>
                </YStack>
              </XStack>

              {/* Comparison with previous session */}
              {lastCompletedSession && (
                <YStack
                  width="100%"
                  bg="$color2"
                  p="$3"
                  rounded="$3"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <Text fontSize={12} color="$color10" fontFamily="$body" mb="$2">
                    vs. Previous ({new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()})
                  </Text>
                  <XStack gap="$4" justify="space-around">
                    <YStack items="center">
                      <Text fontFamily="$body" fontWeight="600" fontSize={14} color={
                        elapsedTime < (lastCompletedSession.totalDurationSeconds || 0)
                          ? '$success'
                          : elapsedTime > (lastCompletedSession.totalDurationSeconds || 0)
                            ? '$red10'
                            : '$color11'
                      }>
                        {elapsedTime < (lastCompletedSession.totalDurationSeconds || 0) ? '-' : '+'}
                        {Math.abs(Math.round((elapsedTime - (lastCompletedSession.totalDurationSeconds || 0)) / 60))} min
                      </Text>
                      <Text fontSize={11} color="$color9" fontFamily="$body">
                        Time
                      </Text>
                    </YStack>
                    <YStack items="center">
                      <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
                        {lastCompletedSession.exercises?.filter(e => e.completed && !e.skipped).length || 0}
                      </Text>
                      <Text fontSize={11} color="$color9" fontFamily="$body">
                        Prev Exercises
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              )}
              
              <Button 
                width="100%"
                size="$5"
                bg="$primary" 
                color="white" 
                icon={Check}
                fontFamily="$body" fontWeight="700"
                rounded="$4"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
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
