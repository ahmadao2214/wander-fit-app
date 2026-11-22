import { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, FlatList, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  YStack,
  XStack,
  Text,
  Card,
  Button,
  Spinner,
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useDragReorder } from '../../../hooks/useDragReorder'
import { Display, SectionTitle, Body, Supporting, Caption, numeric } from '../../../components/Typography'
import { Id } from '../../../convex/_generated/dataModel'
import {
  ChevronLeft,
  Play,
  Lock,
  CheckCircle,
  Clock,
  History,
  RotateCcw,
  ListChecks,
  ClipboardList,
  Bell,
} from '@tamagui/lucide-icons'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ExerciseAccordionItem } from '../../../components/ExerciseAccordionItem'
import { ReplayExcludedSurface } from '../../../components/ReplayExcludedSurface'
import { PerformanceReviewItem } from '../../../components/workout/PerformanceReviewItem'
import { WarmupSection, type WarmupExercise } from '../../../components/workout/WarmupSection'
import { WARMUP_PHASES } from '../../../convex/warmupSequences'
import { workoutMetaLine } from '../../../lib/workoutMeta'
import { PAUSED_SESSION_MESSAGE } from '../../../lib/sessionTiming'
import { analytics } from '../../../lib/analytics'
import {
  mainOrderToTemplateOrder,
  normalizeExerciseOrder,
  templateOrderToMainOrder,
} from '../../../lib/executionOrder'
import { phaseTokens } from '../../../lib/phase'
import { localDayArgs } from '../../../lib/weeksOnPlan'
import { useCurrentDate } from '../../../hooks/useCurrentDate'

/**
 * Exercise type for the draggable list (with intensity scaling)
 */
type ExerciseItem = {
  exerciseId: string
  sets: number
  reps: string
  tempo?: string
  restSeconds: number
  notes?: string
  orderIndex: number
  superset?: string
  exercise?: {
    _id: string
    name: string
    instructions?: string
    tags?: string[]
  }
  // Intensity scaling fields
  scaledSets?: number
  scaledReps?: string
  scaledRestSeconds?: number
  targetWeight?: number
  percentOf1RM?: number
  rpeTarget?: { min: number; max: number }
  isBodyweight?: boolean
  isSubstituted?: boolean
  substitutedExerciseSlug?: string
  hasOneRepMax?: boolean
}

/**
 * Workout Detail Screen
 * 
 * OPEN ACCESS:
 * - Athletes can start ANY workout within their unlocked phases
 * - No suggested/scheduled workout - full flexibility
 * - Locked phases show exercise preview but disable start
 * 
 * FEATURES:
 * - Accordion-style exercise list (collapsed by default for quick scanning)
 * - Drag-and-drop reordering of exercises before starting
 * - Start button in header for quick access from anywhere
 * - Shows exercises in user's custom order if they reordered during execution
 */
export default function WorkoutDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()

  // All hooks must be called before any early returns
  const [isStarting, setIsStarting] = useState(false)

  // Safe back navigation - respects where the user came from
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else if (router.canDismiss()) {
      router.dismiss()
    } else {
      router.replace('/(athlete)')
    }
  }, [router])
  // Track which accordions are expanded (by exercise ID, not index, so state persists through reordering)
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Set<string>>(new Set())

  // View mode for completed workouts: "review" shows performance, "preview" shows exercise list
  const [viewMode, setViewMode] = useState<"review" | "preview">("review")

  // Get the template with category-specific scaling applied (based on user profile)
  const template = useQuery(
    api.programTemplates.getWorkoutWithScaling,
    id ? { templateId: id as Id<"program_templates"> } : "skip"
  )

  // Get user's session for this template (to get custom exercise order)
  const session = useQuery(
    api.gppWorkoutSessions.getSessionForTemplate,
    id ? { templateId: id as Id<"program_templates"> } : "skip"
  )

  // Get last completed session for comparison
  const lastCompletedSession = useQuery(
    api.gppWorkoutSessions.getLastCompletedSessionForTemplate,
    id ? { templateId: id as Id<"program_templates"> } : "skip"
  )

  // Get unlocked phases to check access
  const unlockedPhases = useQuery(
    api.userPrograms.getUnlockedPhases,
    user ? {} : "skip"
  )

  // Check for pending reassessment (to gate next-phase workouts)
  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : "skip"
  )

  // Mutation for starting workout session
  const startSession = useMutation(api.gppWorkoutSessions.startSession)
  
  // Mutation for setting today's focus (auto-focus on start)
  const setTodayFocus = useMutation(api.scheduleOverrides.setTodayFocus)
  
  // Get current today's workout to check if we need to auto-focus
  const today = useCurrentDate()
  const todayWorkout = useQuery(
    api.scheduleOverrides.getTodayWorkout,
    user ? localDayArgs(today) : "skip"
  )

  const isCompleted = session?.status === 'completed'
  // Exit pauses a session, so this workout may be waiting to be resumed
  const isPaused = session?.status === 'in_progress'

  // A workout paused elsewhere has to be resumed or discarded first
  const currentSession = useQuery(
    api.gppWorkoutSessions.getCurrentSession,
    user ? {} : "skip"
  )
  const pausedElsewhere = !!currentSession && !!template && currentSession.templateId !== template._id

  // Check if this workout's phase is unlocked
  const isPhaseUnlocked = (unlockedPhases?.phases as readonly ("GPP" | "SPP" | "SSP")[] | undefined)?.includes(
    template?.phase as "GPP" | "SPP" | "SSP"
  ) ?? false

  // Split exercises into warmup and main sections
  const { warmupExercises, mainExercises } = useMemo(() => {
    const allExercises = (template?.exercises ?? []) as (ExerciseItem & { section?: string; warmupPhase?: string })[]
    const warmup: WarmupExercise[] = []
    const main: ExerciseItem[] = []

    for (const ex of allExercises) {
      // Detect warmup by section field or legacy notes field
      if (ex.section === 'warmup' || (!ex.section && ex.notes === 'Warmup')) {
        warmup.push({
          exerciseId: ex.exerciseId as any,
          name: ex.exercise?.name ?? 'Exercise',
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          warmupPhase: ex.warmupPhase as any,
          section: 'warmup',
          orderIndex: ex.orderIndex,
        })
      } else {
        main.push(ex)
      }
    }

    return { warmupExercises: warmup, mainExercises: main }
  }, [template?.exercises])

  // Warmup duration from phase config (consistent with warmupSequences.ts)
  const warmupDuration = useMemo(() => {
    if (warmupExercises.length === 0) return 0
    const phases = new Set(warmupExercises.map(ex => ex.warmupPhase).filter(Boolean))
    return Math.round(
      WARMUP_PHASES
        .filter(p => phases.has(p.phase))
        .reduce((sum, p) => sum + p.durationMin, 0)
    )
  }, [warmupExercises])

  // Check if reordering is allowed (need at least 2 main exercises)
  const canReorder = isPhaseUnlocked && !isCompleted && mainExercises.length > 1

  // exerciseOrder is stored as template indices; the drag list works in
  // positions among the main exercises. Convert between the two in one place.
  const remappedSavedOrder = useMemo(() => {
    if (!session?.exerciseOrder) return undefined
    const allExercises = (template?.exercises ?? []) as (ExerciseItem & { section?: string })[]
    return templateOrderToMainOrder(
      normalizeExerciseOrder(session.exerciseOrder as number[], allExercises as any),
      allExercises as any
    )
  }, [session?.exerciseOrder, template?.exercises])

  // Use shared drag reorder hook (only main exercises)
  const {
    orderedExercises,
    orderIndices,
    hasCustomOrder,
    handleDragEnd,
    triggerHaptic,
  } = useDragReorder({
    exercises: mainExercises as ExerciseItem[],
    savedOrder: remappedSavedOrder,
    enabled: canReorder,
  })

  // Toggle accordion expansion (by exercise ID so state persists through reordering)
  const toggleExpanded = useCallback((exerciseId: string) => {
    setExpandedExerciseIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }, [])

  // Start workout handler
  const startWorkout = useCallback(async () => {
    if (isStarting || !template) return
    if (pausedElsewhere) {
      alert(PAUSED_SESSION_MESSAGE)
      return
    }

    setIsStarting(true)
    try {
      // Auto-focus: If this workout isn't already today's focus, set it
      // This keeps the Today tab in sync with what user is actually working on
      // Skip for redo (isCompleted) since completed workouts can't be set as focus
      if (!isCompleted && todayWorkout && todayWorkout._id !== template._id) {
        await setTodayFocus({ templateId: template._id })
      }

      // Pass custom exercise order (intensity is now auto-calculated from user profile)
      const result = await startSession({
        ...localDayArgs(),
        templateId: template._id,
        // orderIndices are positions among the main exercises; the session
        // stores template indices (sending positions shifted every exercise
        // by the warmup count and dropped the last one)
        exerciseOrder: hasCustomOrder
          ? mainOrderToTemplateOrder(orderIndices, template.exercises as any)
          : undefined,
      })

      if (!result.isExisting) {
        analytics.trackWorkoutOpened({
          phase: template.phase,
          week: template.week,
          day: template.day,
          intensity: session?.targetIntensity ?? 'Moderate',
          is_redo: isCompleted,
          has_custom_order: hasCustomOrder,
        })
      }

      // Navigate to execution screen with the session ID
      router.push({
        pathname: '/(athlete)/workout/execute/[id]',
        params: { id: result.sessionId },
      })
    } catch (error) {
      console.error('Failed to start workout:', error)
      alert(
        String(error).includes(PAUSED_SESSION_MESSAGE)
          ? PAUSED_SESSION_MESSAGE
          : 'Failed to start workout. Please try again.'
      )
    } finally {
      setIsStarting(false)
    }
  }, [isStarting, isCompleted, pausedElsewhere, template, startSession, router, hasCustomOrder, orderIndices, todayWorkout, setTodayFocus])

  // Target intensity, shown in the header meta line ("~40 min · 7 exercises · Moderate intensity")
  const targetIntensity = session?.targetIntensity || 'Moderate'
  const intensityName = targetIntensity === 'Low'
    ? 'Low intensity'
    : targetIntensity === 'High'
      ? 'High intensity'
      : 'Moderate intensity'

  // Phase identity color (labels, exercise numbers); actions use $primary
  const phase = phaseTokens(template?.phase)

  // Render item for DraggableFlatList
  const renderExerciseItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ExerciseItem>) => {
      const index = getIndex() ?? 0
      return (
        <ScaleDecorator activeScale={1.02}>
          <ExerciseAccordionItem
            exercise={item}
            index={index}
            isExpanded={expandedExerciseIds.has(item.exerciseId)}
            onToggle={() => toggleExpanded(item.exerciseId)}
            drag={canReorder ? drag : undefined}
            isActive={isActive}
            trainingPhase={template?.phase}
          />
        </ScaleDecorator>
      )
    },
    [expandedExerciseIds, toggleExpanded, canReorder, template?.phase]
  )

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: ExerciseItem, index: number) =>
    `${item.exerciseId}-${index}`, [])

  // Performance review data from last completed session
  type ReviewExercise = NonNullable<typeof lastCompletedSession>["exercises"][number]

  // Render item for performance review FlatList
  const renderReviewItem = useCallback(
    ({ item, index }: { item: ReviewExercise; index: number }) => {
      return (
        <PerformanceReviewItem
          exercise={{
            exerciseId: String(item.exerciseId),
            exerciseName: item.exerciseName,
            exerciseSlug: item.exerciseSlug,
            prescribedSets: item.prescribedSets,
            prescribedReps: item.prescribedReps,
            sets: item.sets?.map(s => ({
              setNumber: s.setNumber,
              repsCompleted: s.repsCompleted,
              weight: s.weight,
              rpe: s.rpe,
              completed: s.completed,
              skipped: s.skipped,
            })),
            skipped: item.skipped,
          }}
          index={index}
          isExpanded={expandedExerciseIds.has(String(item.exerciseId))}
          onToggle={() => toggleExpanded(String(item.exerciseId))}
        />
      )
    },
    [expandedExerciseIds, toggleExpanded]
  )

  // Key extractor for review FlatList
  const reviewKeyExtractor = useCallback((item: ReviewExercise, index: number) =>
    `review-${item.exerciseId}-${index}`, [])

  // Header component for the FlatList
  const ListHeader = useMemo(() => {
    if (!template) return null
    return (
      <YStack gap="$3" pb="$3">
        {/* Reassessment Required Banner */}
        {!isPhaseUnlocked && reassessmentStatus?.reassessmentPending && (
          <Card p="$3" bg="$brand1" borderColor="$brand3">
            <XStack items="center" gap="$2">
              <Bell size={18} color="$primaryText" />
              <Supporting color="$brand9" flex={1}>
                Complete your reassessment to unlock {template.phase} workouts
              </Supporting>
              <Button
                size="$2"
                bg="$primary"
                color="white"
                fontFamily="$body" fontWeight="600"
                rounded="$3"
                onPress={() => router.push('/(reassessment)/celebration' as any)}
              >
                Take Assessment
              </Button>
            </XStack>
          </Card>
        )}

        {/* Phase Locked Banner (only if not blocked by reassessment) */}
        {!isPhaseUnlocked && !reassessmentStatus?.reassessmentPending && (
          <Card p="$3" bg="$orange2" borderColor="$orange6">
            <XStack items="center" gap="$2">
              <Lock size={18} color="$orange11" />
              <Supporting color="$orange11" flex={1}>
                Preview mode — complete {template.phase === 'SPP' ? 'GPP' : 'SPP'} to unlock
              </Supporting>
            </XStack>
          </Card>
        )}

        {/* Completed Badge with View Mode Toggle */}
        {isCompleted && (
          <Card p="$3" bg="$green2" borderColor="$green7">
            <XStack items="center" justify="space-between">
              <XStack items="center" gap="$2">
                <CheckCircle size={20} color="$green10" />
                <Text fontWeight="600" color="$green11">
                  Workout Completed
                </Text>
              </XStack>
              {/* View Mode Toggle */}
              <XStack gap="$1" bg="$color3" rounded="$3" p="$1">
                <Button
                  size="$2"
                  bg={viewMode === "review" ? "$surface" : "transparent"}
                  color={viewMode === "review" ? "$color12" : "$color11"}
                  onPress={() => setViewMode("review")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === "review" }}
                  hitSlop={8}
                  icon={ListChecks}
                  px="$2"
                >
                  Review
                </Button>
                <Button
                  size="$2"
                  bg={viewMode === "preview" ? "$surface" : "transparent"}
                  color={viewMode === "preview" ? "$color12" : "$color11"}
                  onPress={() => setViewMode("preview")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === "preview" }}
                  hitSlop={8}
                  icon={ClipboardList}
                  px="$2"
                >
                  Preview
                </Button>
              </XStack>
            </XStack>
          </Card>
        )}

        {/* Session Stats Summary - show for completed in review mode */}
        {isCompleted && viewMode === "review" && lastCompletedSession && (
          <Card p="$4" bg="$color2" borderColor="$borderColor">
            <YStack gap="$3">
              <XStack items="center" gap="$2">
                <History size={18} color="$color11" />
                <Body fontWeight="600">Session summary</Body>
              </XStack>
              <XStack gap="$4" flexWrap="wrap">
                <XStack items="center" gap="$2">
                  <Clock size={14} color="$color10" />
                  <Supporting color="$color11">
                    {Math.round((lastCompletedSession.totalDurationSeconds || 0) / 60)} min
                  </Supporting>
                </XStack>
                <Supporting color="$color10">
                  {lastCompletedSession.targetIntensity || 'Moderate'} intensity
                </Supporting>
                <Supporting color="$color10">
                  {new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()}
                </Supporting>
                {lastCompletedSession.exercises && (
                  <Supporting color="$color10">
                    {lastCompletedSession.exercises.filter(e => !e.skipped).length}/{lastCompletedSession.exercises.length} exercises
                  </Supporting>
                )}
              </XStack>
            </YStack>
          </Card>
        )}

        {/* Previous Performance Summary - show only for non-completed workouts */}
        {!isCompleted && lastCompletedSession && (
          <Card p="$4" bg="$color2" borderColor="$borderColor">
            <YStack gap="$3">
              <XStack items="center" gap="$2">
                <History size={18} color="$color11" />
                <Body fontWeight="600">Previous performance</Body>
              </XStack>
              <XStack gap="$4" flexWrap="wrap">
                <XStack items="center" gap="$2">
                  <Clock size={14} color="$color10" />
                  <Supporting color="$color11">
                    {Math.round((lastCompletedSession.totalDurationSeconds || 0) / 60)} min
                  </Supporting>
                </XStack>
                <Supporting color="$color10">
                  {lastCompletedSession.targetIntensity || 'Moderate'} intensity
                </Supporting>
                <Supporting color="$color10">
                  {new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()}
                </Supporting>
              </XStack>
              {lastCompletedSession.exercises && lastCompletedSession.exercises.length > 0 && (
                <YStack gap="$2" pt="$2" borderTopWidth={1} borderTopColor="$borderColor">
                  {lastCompletedSession.exercises.slice(0, 3).map((ex) => {
                    const completedSets = ex.sets?.filter(s => s.completed && !s.skipped) || []
                    const bestSet = completedSets.reduce((best, set) => {
                      if (!best) return set
                      if ((set.weight || 0) > (best.weight || 0)) return set
                      return best
                    }, completedSets[0])

                    if (!bestSet || ex.skipped) return null

                    return (
                      <XStack key={String(ex.exerciseId)} justify="space-between" items="center">
                        <Supporting numberOfLines={1} flex={1}>
                          {ex.exerciseName}
                        </Supporting>
                        <Supporting color="$color10" style={numeric}>
                          {completedSets.length} sets
                          {bestSet.weight ? ` @ ${bestSet.weight} lbs` : ''}
                          {bestSet.repsCompleted ? ` × ${bestSet.repsCompleted}` : ''}
                        </Supporting>
                      </XStack>
                    )
                  })}
                  {lastCompletedSession.exercises.length > 3 && (
                    <Caption color="$color9">
                      +{lastCompletedSession.exercises.length - 3} more exercises
                    </Caption>
                  )}
                </YStack>
              )}
            </YStack>
          </Card>
        )}

        {/* Warmup Section Preview (collapsible) */}
        {warmupExercises.length > 0 && !isCompleted && (
          <WarmupSection
            exercises={warmupExercises}
            totalDuration={warmupDuration}
            onComplete={() => {}}
            mode="preview"
            trainingPhase={template?.phase}
          />
        )}

        {/* Exercise List Header */}
        <XStack items="center" justify="space-between" pt="$2">
          <SectionTitle>{isCompleted && viewMode === "review" ? "Performance" : "Exercises"}</SectionTitle>
          {canReorder && viewMode === "preview" && (
            <Caption color="$color10">
              Hold to drag
            </Caption>
          )}
        </XStack>
      </YStack>
    )
  }, [template, isPhaseUnlocked, isCompleted, canReorder, lastCompletedSession, viewMode, reassessmentStatus])

  // Footer component with bottom padding
  const ListFooter = useMemo(() => {
    if (!isPhaseUnlocked) {
      return (
        <Card p="$4" bg="$gray3" borderColor="$gray6" mt="$4">
          <XStack items="center" justify="center" gap="$2">
            <Lock size={20} color="$color10" />
            <Text color="$color10" fontWeight="500">
              Complete previous phase to start
            </Text>
          </XStack>
        </Card>
      )
    }
    return <YStack height={40} />
  }, [isPhaseUnlocked])

  // Early returns AFTER all hooks
  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Please log in to view workouts</Text>
      </YStack>
    )
  }

  if (template === undefined || unlockedPhases === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primaryText" />
        <Text>Loading workout...</Text>
      </YStack>
    )
  }

  if (!template) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text>Workout not found</Text>
        <Button onPress={handleBack}>Go Back</Button>
      </YStack>
    )
  }

  return (
    <ReplayExcludedSurface>
    <GestureHandlerRootView style={styles.container}>
      <YStack flex={1} bg="$background">
        {/* Header: back + primary action, then the title on its own line */}
        <YStack px="$4" pt={insets.top + 4} pb="$3" gap="$2" bg="$background">
          <XStack items="center" justify="space-between" minH={44}>
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.backButton}
            >
              <ChevronLeft size={28} color="$color" />
            </Pressable>
            {isPhaseUnlocked && !isCompleted && (
              <Button
                size="$4"
                bg="$primary"
                color="white"
                onPress={startWorkout}
                testID="workout-start"
                icon={isStarting ? undefined : Play}
                fontSize={18}
                fontWeight="700"
                disabled={isStarting}
                pressStyle={{ scale: 0.97, bg: '$primaryPress' }}
              >
                {isStarting ? '…' : isPaused ? 'Resume' : 'Start'}
              </Button>
            )}
            {isPhaseUnlocked && isCompleted && (
              <Button
                size="$4"
                bg="$color4"
                borderWidth={2}
                borderColor="$primary"
                color="$primaryText"
                onPress={startWorkout}
                icon={isStarting ? undefined : RotateCcw}
                fontWeight="600"
                disabled={isStarting}
              >
                {isStarting ? '…' : 'Redo'}
              </Button>
            )}
          </XStack>
          <YStack gap="$1">
            {/* The one display moment on this screen; long names wrap rather than truncate */}
            <Display accessibilityRole="header">{template.name}</Display>
            <Supporting testID="workout-meta" color="$color10">
              <Supporting fontWeight="600" color={phase.text}>
                {template.phase}
              </Supporting>
              {' · '}
              {workoutMetaLine({
                minutes: template.estimatedDurationMinutes,
                exerciseCount: mainExercises.length,
                intensity: isPhaseUnlocked && !isCompleted ? intensityName : undefined,
              })}
            </Supporting>
          </YStack>
        </YStack>

        {/* Exercise/Review List */}
        <View style={styles.listContainer}>
          {isCompleted && viewMode === "review" && lastCompletedSession?.exercises ? (
            // Performance Review Mode - show completed exercise data
            <FlatList
              data={lastCompletedSession.exercises}
              keyExtractor={reviewKeyExtractor}
              renderItem={renderReviewItem}
              ListHeaderComponent={ListHeader ?? undefined}
              ListFooterComponent={ListFooter}
              contentContainerStyle={styles.contentContainer}
              style={styles.flatList}
            />
          ) : (
            // Exercise Preview Mode - draggable list
            <DraggableFlatList
              data={orderedExercises as ExerciseItem[]}
              onDragEnd={handleDragEnd}
              keyExtractor={keyExtractor}
              renderItem={renderExerciseItem}
              ListHeaderComponent={ListHeader ?? undefined}
              ListFooterComponent={ListFooter}
              contentContainerStyle={styles.contentContainer}
              containerStyle={styles.flatList}
              activationDistance={10}
              onDragBegin={triggerHaptic}
            />
          )}
        </View>
      </YStack>
    </GestureHandlerRootView>
    </ReplayExcludedSurface>
  )
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
  },
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
})
