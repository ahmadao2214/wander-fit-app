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
  Timer,
} from '@tamagui/lucide-icons'
import { ExerciseTypeIcon } from '../../../../components/workout/ExerciseTypeIcon'
import { SetTracker } from '../../../../components/workout/SetTracker'
import { InstructionsAccordion } from '../../../../components/workout/InstructionsAccordion'
import { ExerciseQueue } from '../../../../components/workout/ExerciseQueue'
import { ConfettiEffect } from '../../../../components/workout/ConfettiEffect'
import { WarmupSection, type WarmupExercise } from '../../../../components/workout/WarmupSection'
import { WARMUP_PHASES } from '../../../../convex/warmupSequences'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PanResponder, Platform, Vibration, Animated, Pressable } from 'react-native'
import { mapIntensityToLevel, normalizeTrackedSets } from '../../../../lib'
import { activeSeconds } from '../../../../lib/sessionTiming'
import {
  alignCompletionsToTemplate,
  isWarmupExercise,
  mainTemplateIndices,
  normalizeExerciseOrder,
} from '../../../../lib/executionOrder'
import { phaseTokens } from '../../../../lib/phase'
import { Display, Title, SectionTitle, Body, Supporting, Caption, numeric, TYPE_SCALE } from '../../../../components/Typography'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Ticks every second, so its digits are fixed-width
const TimerDisplay = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: TYPE_SCALE.section.size,
  lineHeight: TYPE_SCALE.section.lineHeight,
  fontVariant: ['tabular-nums'],
})

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

  // Warmup flow state — skip warmup if session already has progress (e.g. resuming)
  const [showWarmup, setShowWarmup] = useState(true)
  const warmupInitRef = useRef(false)

  // Reassessment prompt state
  const [showReassessmentPrompt, setShowReassessmentPrompt] = useState(false)
  const [reassessmentPhase, setReassessmentPhase] = useState<string | null>(null)

  // Auto-save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Store warmup completion placeholders and their original indices so we can
  // reconstruct the full exercises array (warmup + main) when saving.
  // This preserves positional alignment with the template and keeps warmup
  // data in completed sessions for analytics/review.
  const warmupDataRef = useRef<{ indices: Set<number>; completions: Map<number, ExerciseCompletion> } | null>(null)

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
  const pauseSession = useMutation(api.gppWorkoutSessions.pauseSession)
  const resumeSession = useMutation(api.gppWorkoutSessions.resumeSession)
  const advanceToNextDay = useMutation(api.userPrograms.advanceToNextDay)

  // Refs for swipe tracking
  const currentIndexRef = useRef(currentExerciseIndex)

  // Position in the athlete's order -> slot in exerciseCompletions (template order).
  // The shown exercise and its sets must come from the same template index.
  const mainSlotOfTemplateIndex = useMemo(() => {
    const templateExs = (session?.template?.exercises ?? []) as any[]
    return new Map(mainTemplateIndices(templateExs).map((idx, slot) => [idx, slot]))
  }, [session?.template?.exercises])
  const completionSlotAt = (position: number): number | undefined => {
    if (exerciseOrder.length === 0) return position // legacy templates without a section field
    const templateIdx = exerciseOrder[position]
    return templateIdx === undefined ? undefined : mainSlotOfTemplateIndex.get(templateIdx)
  }
  const completionAt = (position: number): ExerciseCompletion | undefined => {
    const slot = completionSlotAt(position)
    return slot === undefined ? undefined : exerciseCompletions[slot]
  }
  const exerciseCountRef = useRef(0)

  // Map backend intensity to frontend IntensityLevel
  const intensity = useMemo(
    () => mapIntensityToLevel(session?.targetIntensity),
    [session?.targetIntensity]
  )

  // Phase identity colors (progress dots, set tiles, queue); actions use $primary
  const phase = phaseTokens(session?.template?.phase)

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
  // Filter warmup exercises so exerciseCompletions aligns with orderedExercises
  useEffect(() => {
    if (session?.exercises && !isInitialized) {
      if (session.template?.exercises) {
        const templateExs = session.template.exercises as any[]

        // Completions live in TEMPLATE order; exerciseOrder only says which
        // template exercise comes next. Saves from earlier builds could be
        // misaligned (reordered positions, or main exercises only), so match
        // each saved completion back to its exercise by ID.
        const aligned = alignCompletionsToTemplate(templateExs, session.exercises as ExerciseCompletion[])
        const warmupIndices = new Set(
          templateExs.map((_, idx) => idx).filter((idx) => isWarmupExercise(templateExs[idx]))
        )
        const warmupCompletions = new Map<number, ExerciseCompletion>()
        for (const idx of warmupIndices) {
          const tmpl = templateExs[idx]
          warmupCompletions.set(idx, aligned[idx] ?? {
            exerciseId: tmpl.exerciseId,
            completed: true,
            skipped: true,
            sets: Array.from({ length: tmpl.sets || 1 }, () => ({
              completed: true,
              skipped: true,
            })),
          })
        }
        warmupDataRef.current = { indices: warmupIndices, completions: warmupCompletions }

        // One completion per main exercise, in template order
        const mainIndices = mainTemplateIndices(templateExs)
        const normalizedCompletions = mainIndices.map((idx) => {
          const tmpl = templateExs[idx]
          const prescribedSets = tmpl.scaledSets ?? tmpl.sets ?? 1
          const completion = aligned[idx] ?? {
            exerciseId: tmpl.exerciseId,
            completed: false,
            skipped: false,
            sets: [],
          }
          return {
            ...completion,
            sets: normalizeTrackedSets(completion.sets, prescribedSets),
          }
        })

        setExerciseCompletions(normalizedCompletions)
        exerciseCountRef.current = normalizedCompletions.length

        // A complete order of the main exercises (repairs truncated or stale saves)
        const order = normalizeExerciseOrder(session.exerciseOrder as number[] | undefined, templateExs)
        setExerciseOrder(order)

        // Resume at the first exercise in the athlete's order that isn't done
        const mainSlotOf = new Map(mainIndices.map((idx, slot) => [idx, slot]))
        const firstIncomplete = order.findIndex((idx) => {
          const completion = normalizedCompletions[mainSlotOf.get(idx) ?? -1]
          return completion && !completion.completed && !completion.skipped
        })
        if (firstIncomplete !== -1) {
          setCurrentExerciseIndex(firstIncomplete)
        }
      } else {
        // Legacy templates without section field
        setExerciseCompletions(session.exercises as ExerciseCompletion[])
        exerciseCountRef.current = session.exercises.length

        const firstIncomplete = session.exercises.findIndex(
          (e) => !e.completed && !e.skipped
        )
        if (firstIncomplete !== -1) {
          setCurrentExerciseIndex(firstIncomplete)
        }
      }

      setIsInitialized(true)

      // Skip warmup if session already has progress (e.g. resuming after backgrounding)
      if (!warmupInitRef.current) {
        warmupInitRef.current = true
        const hasProgress = session.exercises.some((e: any) => e.completed || e.skipped)
        if (hasProgress) {
          setShowWarmup(false)
        }
      }
    }
  }, [session, isInitialized])

  // Opening a paused session ends the pause, so its clock runs again. Not
  // after this screen's own Exit: its pause must stand until Resume.
  const resumeRequestedRef = useRef(false)
  useEffect(() => {
    if (!session?._id || session.pausedAt === undefined || resumeRequestedRef.current) return
    if (sessionEndedRef.current) return
    resumeRequestedRef.current = true
    resumeSession({ sessionId: session._id }).catch((error) => {
      console.error('Failed to resume workout:', error)
    })
  }, [session?._id, session?.pausedAt, resumeSession])

  // Elapsed time counter. Time spent paused doesn't count.
  const startedAt = session?.startedAt
  const pausedAt = session?.pausedAt
  const pausedSeconds = session?.pausedSeconds
  useEffect(() => {
    if (!startedAt) return
    const tick = () => setElapsedTime(activeSeconds({ startedAt, pausedAt, pausedSeconds }, Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, pausedAt, pausedSeconds])

  // Reconstruct the full exercises array (warmup + main) for saving.
  // This preserves positional alignment with the template and keeps
  // warmup data in completed session records.
  const buildFullExercises = useCallback((mainCompletions: ExerciseCompletion[]): ExerciseCompletion[] => {
    const warmupData = warmupDataRef.current
    if (!warmupData || warmupData.indices.size === 0) {
      return mainCompletions // No warmup exercises in template
    }

    const templateExs = session?.template?.exercises
    if (!templateExs) return mainCompletions

    const full: ExerciseCompletion[] = []
    let mainIdx = 0
    for (let i = 0; i < templateExs.length; i++) {
      if (warmupData.indices.has(i)) {
        // Insert warmup completion (stored or placeholder)
        const stored = warmupData.completions.get(i)
        if (stored) {
          full.push({ ...stored, completed: true, skipped: true })
        } else {
          // Create placeholder for warmup exercises
          const tmpl = templateExs[i] as any
          full.push({
            exerciseId: tmpl.exerciseId,
            completed: true,
            skipped: true,
            sets: [{ completed: true, skipped: true }],
          })
        }
      } else if (mainIdx < mainCompletions.length) {
        full.push(mainCompletions[mainIdx++])
      }
    }
    return full
  }, [session?.template?.exercises])

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
            exercises: buildFullExercises(exerciseCompletions),
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
  }, [sessionId, exerciseCompletions, exerciseOrder, updateProgress, buildFullExercises])

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
      const slot = completionSlotAt(currentExerciseIndex)
      if (slot === undefined || !updated[slot]) return prev
      const exercise = { ...updated[slot] }
      exercise.sets = [...exercise.sets]
      exercise.sets[setIndex] = data

      const allSetsCompleted = exercise.sets.every(s => s.completed || s.skipped)
      exercise.completed = allSetsCompleted

      // Finishing the last set doesn't move on by itself; the athlete taps Next
      updated[slot] = exercise
      return updated
    })
  }

  // Clean up save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [])

  // Navigate to next exercise
  const goToNextExercise = async () => {
    if (sessionId) {
      await updateProgress({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: buildFullExercises(exerciseCompletions),
      })
    }

    if (currentExerciseIndex < exerciseCountRef.current - 1) {
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
        exercises: buildFullExercises(exerciseCompletions),
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })

      // Advance program position
      if (session?.userProgramId) {
        try {
          const result = await advanceToNextDay({ programId: session.userProgramId })

          if (result?.triggerReassessment) {
            // Show reassessment prompt instead of navigating away
            setReassessmentPhase(result.completedPhase ?? null)
            setShowCompletionDialog(false)
            setShowReassessmentPrompt(true)
            return
          }
        } catch (advanceError) {
          // Log but don't block — workout is already completed
          console.error('Failed to advance program:', advanceError)
        }
      }

      setShowCompletionDialog(false)
      router.replace('/(athlete)')
    } catch (error) {
      console.error('Failed to complete workout:', error)
      router.replace('/(athlete)')
    }
  }

  // Exit: pause the workout. The logged sets are saved and Today offers Resume.
  const handlePauseWorkout = async () => {
    // Mark session as ended to prevent further auto-saves
    sessionEndedRef.current = true
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    try {
      await pauseSession({
        sessionId: sessionId as Id<"gpp_workout_sessions">,
        exercises: buildFullExercises(exerciseCompletions),
        exerciseOrder: exerciseOrder.length > 0 ? exerciseOrder : undefined,
      })
      setShowExitDialog(false)
      router.replace('/(athlete)')
    } catch (error) {
      console.error('Failed to pause workout:', error)
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
    if (fromIndex >= exerciseOrder.length || toIndex >= exerciseOrder.length) return

    // Only the order moves. Completions stay in template order, so each
    // exercise keeps its own sets.
    setExerciseOrder(prev => {
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

  // Separate warmup exercises from main workout exercises
  const { warmupExs, mainTemplateExercises } = useMemo(() => {
    const warmup: WarmupExercise[] = []
    const main = templateExercises.filter((ex: any) => {
      // Detect warmup by section field or legacy notes field
      if (ex.section === 'warmup' || (!ex.section && ex.notes === 'Warmup')) {
        warmup.push({
          exerciseId: ex.exerciseId,
          name: ex.exercise?.name ?? 'Exercise',
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          warmupPhase: ex.warmupPhase,
          section: 'warmup',
          orderIndex: ex.orderIndex,
        })
        return false
      }
      return true
    })
    return { warmupExs: warmup, mainTemplateExercises: main }
  }, [templateExercises])

  const hasWarmup = warmupExs.length > 0
  // Compute duration from warmup phase config (consistent with warmupSequences.ts)
  const warmupDuration = useMemo(() => {
    if (warmupExs.length === 0) return 0
    const phases = new Set(warmupExs.map(ex => ex.warmupPhase).filter(Boolean))
    return Math.round(
      WARMUP_PHASES
        .filter(p => phases.has(p.phase))
        .reduce((sum, p) => sum + p.durationMin, 0)
    )
  }, [warmupExs])

  // exerciseOrder is normalized on load: every main exercise once, by template index
  const orderedExercises = exerciseOrder.length > 0
    ? exerciseOrder.map(idx => templateExercises[idx]).filter((ex: any) => ex != null && !isWarmupExercise(ex))
    : mainTemplateExercises

  // Keep exercise count ref in sync with orderedExercises length so swipe
  // bounds stay correct even if filtering produces fewer exercises than
  // exerciseCompletions (e.g. stale exerciseOrder with out-of-bounds indices).
  useEffect(() => {
    if (orderedExercises.length > 0) {
      exerciseCountRef.current = orderedExercises.length
    }
  }, [orderedExercises.length])

  const currentExercise = orderedExercises[currentExerciseIndex]
  const currentCompletion = completionAt(currentExerciseIndex)
  const currentSetCount = currentExercise ? (currentExercise.scaledSets ?? currentExercise.sets) : 0

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
        <Spinner size="large" color="$primaryText" />
        <Text fontFamily="$body" color="$color10">Loading workout...</Text>
      </YStack>
    )
  }

  // Show warmup flow screen before main execution (must be before
  // the !currentExercise guard so warmup renders even when main
  // exercises haven't loaded yet, e.g. during initial state setup)
  if (showWarmup && hasWarmup) {
    return (
      <WarmupSection
        exercises={warmupExs}
        totalDuration={warmupDuration}
        onComplete={() => setShowWarmup(false)}
        onBack={() => router.back()}
        mode="flow"
        trainingPhase={template?.phase}
      />
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
        {/* Header */}
        <XStack
          px="$4"
          pt={insets.top + 8}
          pb="$3"
          items="center"
          justify="space-between"
          bg="$surface"
        >
          <Pressable
            onPress={() => setShowExitDialog(true)}
            hitSlop={8}
            testID="execute-exit"
            accessibilityRole="button"
            accessibilityLabel="Exit workout"
          >
            <X size={28} color="$color" />
          </Pressable>

          {/* Dot Stepper Progress */}
          {/* Done = solid phase dot, current = wide pill, upcoming = hollow ring:
              the shape carries the state, so it never depends on color alone */}
          <XStack
            items="center"
            gap="$1.5"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Exercise ${currentExerciseIndex + 1} of ${orderedExercises.length}, ${
              orderedExercises.filter((_, idx) => completionAt(idx)?.completed).length
            } done`}
            testID="exercise-progress"
          >
            {orderedExercises.map((_, idx) => {
              const isCompleted = completionAt(idx)?.completed
              const isCurrent = idx === currentExerciseIndex
              return (
                <YStack
                  key={idx}
                  width={isCurrent ? 18 : 8}
                  height={8}
                  rounded={100}
                  bg={isCurrent ? '$color12' : isCompleted ? phase.fill : 'transparent'}
                  borderWidth={isCurrent || isCompleted ? 0 : 1.5}
                  borderColor={isCurrent || isCompleted ? undefined : '$color8'}
                />
              )
            })}
          </XStack>

          <XStack items="center" gap="$1.5">
            <Timer size={16} color="$color10" />
            <TimerDisplay color="$color10">
              {formatTime(elapsedTime)}
            </TimerDisplay>
          </XStack>
        </XStack>

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
                  bg="$color3"
                  p="$4"
                  rounded="$10"
                >
                  <ExerciseTypeIcon
                    tags={exerciseDetails?.tags || []}
                    size={48}
                    color="$color10"
                  />
                </YStack>
              </YStack>

              {/* Exercise Name and Prescription */}
              <YStack items="center" gap="$3">
                <Display testID="execute-exercise-name" text="center" accessibilityRole="header">
                  {exerciseDetails?.name || 'Exercise'}
                </Display>

                {/* Prominent sets x reps badge */}
                <XStack
                  bg="$color3"
                  px="$4"
                  py="$2.5"
                  rounded="$4"
                  items="center"
                  gap="$2"
                >
                  <SectionTitle accessibilityRole={undefined} fontWeight="700" style={numeric}>
                    {currentSetCount} {currentSetCount === 1 ? 'set' : 'sets'}
                  </SectionTitle>
                  <Body color="$color10">×</Body>
                  <SectionTitle accessibilityRole={undefined} fontWeight="700" style={numeric}>
                    {currentExercise.scaledReps ?? currentExercise.reps}
                  </SectionTitle>
                </XStack>

                {currentExercise.tempo && (
                  <Supporting color="$color9">
                    {currentExercise.tempo} tempo
                  </Supporting>
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
                  trainingPhase={session?.template?.phase}
                  previousSets={previousSetsForCurrentExercise}
                />
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
        >
          <Button
            flex={1}
            size="$5"
            bg="$color3"
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
            bg="$primary"
            color="white"
            iconAfter={isLastExercise ? Trophy : ChevronRight}
            fontSize={18}
            fontFamily="$body" fontWeight="700"
            rounded="$4"
            pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
            onPress={goToNextExercise}
            testID="execute-next"
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
          completed: completionAt(idx)?.completed || false,
        }))}
        currentIndex={currentExerciseIndex}
        onExerciseSelect={handleExerciseSelect}
        onReorder={handleReorder}
        trainingPhase={session?.template?.phase}
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
              <AlertDialog.Title fontFamily="$body" fontWeight="700" fontSize={18} lineHeight={24}>
                Pause this workout?
              </AlertDialog.Title>
              <AlertDialog.Description fontFamily="$body" color="$color10">
                Your logged sets are saved. Pick up where you left off from Today.
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
                    Keep going
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  {/* Not red: pausing keeps everything, so it isn't destructive */}
                  <Button 
                    flex={1} 
                    bg="$primary"
                    color="white"
                    fontFamily="$body" fontWeight="700"
                    rounded="$4"
                    onPress={handlePauseWorkout}
                    testID="exit-pause"
                  >
                    Pause and exit
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
          {/* Confetti celebration effect */}
          <ConfettiEffect trigger={showCompletionDialog} />

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
                <Display>Workout complete!</Display>
                <Text fontFamily="$body" color="$color10">
                  Great work today
                </Text>
              </YStack>
              
              <XStack gap="$6">
                <YStack items="center">
                  <Title color="$primaryText" style={numeric}>
                    {formatTime(elapsedTime)}
                  </Title>
                  <Caption color="$color10">
                    Duration
                  </Caption>
                </YStack>
                <YStack items="center">
                  <Title color="$green11" style={numeric}>
                    {completedCount}/{orderedExercises.length}
                  </Title>
                  <Caption color="$color10">
                    Exercises
                  </Caption>
                </YStack>
                <YStack items="center">
                  <Title color="$color11" style={numeric}>
                    {exerciseCompletions.reduce((total, ex) =>
                      total + ex.sets.filter(s => s.completed && !s.skipped).length, 0
                    )}
                  </Title>
                  <Caption color="$color10">
                    Sets
                  </Caption>
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
                  <Caption color="$color10" mb="$2">
                    vs. Previous ({new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()})
                  </Caption>
                  <XStack gap="$4" justify="space-around">
                    <YStack items="center">
                      <Supporting fontWeight="600" color={
                        elapsedTime < (lastCompletedSession.totalDurationSeconds || 0)
                          ? '$success'
                          : elapsedTime > (lastCompletedSession.totalDurationSeconds || 0)
                            ? '$red10'
                            : '$color11'
                      }>
                        {elapsedTime < (lastCompletedSession.totalDurationSeconds || 0) ? '-' : '+'}
                        {Math.abs(Math.round((elapsedTime - (lastCompletedSession.totalDurationSeconds || 0)) / 60))} min
                      </Supporting>
                      <Caption color="$color9">
                        Time
                      </Caption>
                    </YStack>
                    <YStack items="center">
                      <Supporting fontWeight="600" color="$color11">
                        {lastCompletedSession.exercises?.filter(e => e.completed && !e.skipped).length || 0}
                      </Supporting>
                      <Caption color="$color9">
                        Prev Exercises
                      </Caption>
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
                pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
                onPress={handleCompleteWorkout}
              >
                Done
              </Button>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>

      {/* Reassessment Prompt Dialog */}
      <AlertDialog open={showReassessmentPrompt} onOpenChange={setShowReassessmentPrompt}>
        <AlertDialog.Portal>
          <ConfettiEffect trigger={showReassessmentPrompt} />
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
                <Display text="center">{reassessmentPhase} phase complete!</Display>
                <Text fontFamily="$body" color="$color10" text="center">
                  Complete a quick check-in to unlock the next phase.
                </Text>
              </YStack>

              <Button
                width="100%"
                size="$5"
                bg="$primary"
                color="white"
                fontFamily="$body" fontWeight="700"
                rounded="$4"
                pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
                onPress={() => {
                  setShowReassessmentPrompt(false)
                  router.replace('/(reassessment)/celebration' as any)
                }}
              >
                Start Check-In
              </Button>
              <Button
                width="100%"
                size="$4"
                bg="transparent"
                color="$color10"
                fontFamily="$body"
                onPress={() => {
                  setShowReassessmentPrompt(false)
                  router.replace('/(athlete)')
                }}
              >
                I'll do it later
              </Button>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  )
}
