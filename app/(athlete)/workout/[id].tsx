import { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  YStack,
  XStack,
  H3,
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
import { Id } from '../../../convex/_generated/dataModel'
import {
  Play,
  Lock,
  CheckCircle,
  Clock,
  History,
  RotateCcw,
  ListChecks,
  ClipboardList,
  Info,
  Zap,
  Flame,
} from '@tamagui/lucide-icons'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ExerciseAccordionItem } from '../../../components/ExerciseAccordionItem'
import { PerformanceReviewItem } from '../../../components/workout/PerformanceReviewItem'

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

  // Safe back navigation - avoids getting stuck in execution screens
  const handleBack = useCallback(() => {
    // Use dismiss if available (pops screen from stack cleanly)
    // Falls back to navigating to Program tab as a safe default
    if (router.canDismiss()) {
      router.dismiss()
    } else {
      router.replace('/(athlete)/program')
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

  // Mutation for starting workout session
  const startSession = useMutation(api.gppWorkoutSessions.startSession)
  
  // Mutation for setting today's focus (auto-focus on start)
  const setTodayFocus = useMutation(api.scheduleOverrides.setTodayFocus)
  
  // Get current today's workout to check if we need to auto-focus
  const todayWorkout = useQuery(
    api.scheduleOverrides.getTodayWorkout,
    user ? {} : "skip"
  )

  const isCompleted = session?.status === 'completed'

  // Check if this workout's phase is unlocked
  const isPhaseUnlocked = (unlockedPhases?.phases as readonly ("GPP" | "SPP" | "SSP")[] | undefined)?.includes(
    template?.phase as "GPP" | "SPP" | "SSP"
  ) ?? false

  // Check if reordering is allowed (need at least 2 exercises)
  const canReorder = isPhaseUnlocked && !isCompleted && (template?.exercises?.length ?? 0) > 1

  // Use shared drag reorder hook
  const {
    orderedExercises,
    orderIndices,
    hasCustomOrder,
    handleDragEnd,
    triggerHaptic,
  } = useDragReorder({
    exercises: (template?.exercises ?? []) as ExerciseItem[],
    savedOrder: session?.exerciseOrder,
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
        templateId: template._id,
        exerciseOrder: hasCustomOrder ? orderIndices : undefined,
      })

      // Navigate to execution screen with the session ID
      router.push({
        pathname: '/(athlete)/workout/execute/[id]',
        params: { id: result.sessionId },
      })
    } catch (error) {
      console.error('Failed to start workout:', error)
      alert('Failed to start workout. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }, [isStarting, isCompleted, template, startSession, router, hasCustomOrder, orderIndices, todayWorkout, setTodayFocus])

  // Intensity color for personalized workouts (based on session target intensity)
  // Intensity is determined when session starts, defaults to 'Moderate' for preview
  const targetIntensity = session?.targetIntensity || 'Moderate'
  const intensityColor = targetIntensity === 'Low'
    ? '$intensityLow6'
    : targetIntensity === 'High'
      ? '$intensityHigh6'
      : '$intensityMed6'
  const intensityLabel = targetIntensity === 'Low'
    ? 'LOW'
    : targetIntensity === 'High'
      ? 'HIGH'
      : 'MODERATE'

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
            intensityColor={intensityColor}
          />
        </ScaleDecorator>
      )
    },
    [expandedExerciseIds, toggleExpanded, canReorder, intensityColor]
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
        {/* Phase and Intensity Badges */}
        <XStack gap="$2" flexWrap="wrap" items="center">
          {/* Phase Badge - neutral brand colors */}
          <Card bg="$brand2" px="$3" py="$1" rounded="$10">
            <Text fontSize="$2" color="$primary" fontWeight="600">
              {template.phase}
            </Text>
          </Card>
          {/* Intensity Badge - traffic light colors */}
          {isPhaseUnlocked && !isCompleted && (
            <Card
              bg={intensityColor === '$intensityHigh6' ? '$intensityHigh2' : intensityColor === '$intensityLow6' ? '$intensityLow2' : '$intensityMed2'}
              px="$3"
              py="$1"
              rounded="$10"
            >
              <XStack items="center" gap="$1">
                {intensityColor === '$intensityHigh6' ? (
                  <Flame size={12} color={intensityColor} />
                ) : (
                  <Zap size={12} color={intensityColor} />
                )}
                <Text fontSize="$2" color={intensityColor} fontWeight="600">
                  {intensityLabel}
                </Text>
              </XStack>
            </Card>
          )}
        </XStack>

        {/* Phase Locked Banner */}
        {!isPhaseUnlocked && (
          <Card p="$3" bg="$orange2" borderColor="$orange6">
            <XStack items="center" gap="$2">
              <Lock size={18} color="$orange11" />
              <Text fontSize="$3" color="$orange11" flex={1}>
                Preview mode — complete {template.phase === 'SPP' ? 'GPP' : 'SPP'} to unlock
              </Text>
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
              <XStack gap="$1" bg="$green3" rounded="$3" p="$1">
                <Button
                  size="$2"
                  bg={viewMode === "review" ? "$green6" : "transparent"}
                  color={viewMode === "review" ? "white" : "$green11"}
                  onPress={() => setViewMode("review")}
                  icon={ListChecks}
                  px="$2"
                >
                  Review
                </Button>
                <Button
                  size="$2"
                  bg={viewMode === "preview" ? "$green6" : "transparent"}
                  color={viewMode === "preview" ? "white" : "$green11"}
                  onPress={() => setViewMode("preview")}
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
                <Text fontSize="$3" fontWeight="600" color="$color12">
                  Session Summary
                </Text>
              </XStack>
              <XStack gap="$4" flexWrap="wrap">
                <XStack items="center" gap="$2">
                  <Clock size={14} color="$color10" />
                  <Text fontSize="$3" color="$color11">
                    {Math.round((lastCompletedSession.totalDurationSeconds || 0) / 60)} min
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$color10">
                  {lastCompletedSession.targetIntensity || 'Moderate'} intensity
                </Text>
                <Text fontSize="$3" color="$color10">
                  {new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()}
                </Text>
                {lastCompletedSession.exercises && (
                  <Text fontSize="$3" color="$color10">
                    {lastCompletedSession.exercises.filter(e => !e.skipped).length}/{lastCompletedSession.exercises.length} exercises
                  </Text>
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
                <Text fontSize="$3" fontWeight="600" color="$color12">
                  Previous Performance
                </Text>
              </XStack>
              <XStack gap="$4" flexWrap="wrap">
                <XStack items="center" gap="$2">
                  <Clock size={14} color="$color10" />
                  <Text fontSize="$3" color="$color11">
                    {Math.round((lastCompletedSession.totalDurationSeconds || 0) / 60)} min
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$color10">
                  {lastCompletedSession.targetIntensity || 'Moderate'} intensity
                </Text>
                <Text fontSize="$3" color="$color10">
                  {new Date(lastCompletedSession.completedAt || 0).toLocaleDateString()}
                </Text>
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
                        <Text fontSize="$2" color="$color11" numberOfLines={1} flex={1}>
                          {ex.exerciseName}
                        </Text>
                        <Text fontSize="$2" color="$color10">
                          {completedSets.length} sets
                          {bestSet.weight ? ` @ ${bestSet.weight} lbs` : ''}
                          {bestSet.repsCompleted ? ` x ${bestSet.repsCompleted}` : ''}
                        </Text>
                      </XStack>
                    )
                  })}
                  {lastCompletedSession.exercises.length > 3 && (
                    <Text fontSize="$2" color="$color9">
                      +{lastCompletedSession.exercises.length - 3} more exercises
                    </Text>
                  )}
                </YStack>
              )}
            </YStack>
          </Card>
        )}

        {/* Personalized Workout Info */}
        {isPhaseUnlocked && !isCompleted && template?.scalingInfo && (
          <Card p="$3" bg="$brand1" borderColor="$brand3">
            <XStack items="center" justify="space-between">
              <XStack items="center" gap="$2" flex={1}>
                <CheckCircle size={18} color="$primary" />
                <Text fontSize="$3" color="$brand9" flex={1}>
                  Personalized for your {template.scalingInfo.ageGroup} age group and {template.scalingInfo.categoryName} training
                </Text>
              </XStack>
              <Button
                size="$2"
                bg="transparent"
                p="$1"
                onPress={() => router.push('/(athlete)/training-science' as any)}
                pressStyle={{ opacity: 0.7 }}
              >
                <Info size={18} color="$primary" />
              </Button>
            </XStack>
          </Card>
        )}

        {/* Exercise List Header */}
        <XStack items="center" justify="space-between" pt="$2">
          <H3>{isCompleted && viewMode === "review" ? "Performance" : "Exercises"}</H3>
          {canReorder && viewMode === "preview" && (
            <Text fontSize="$2" color="$color10">
              Hold to drag
            </Text>
          )}
        </XStack>
      </YStack>
    )
  }, [template, isPhaseUnlocked, isCompleted, canReorder, lastCompletedSession, viewMode])

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
        <Spinner size="large" color="$green10" />
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
    <GestureHandlerRootView style={styles.container}>
      <YStack flex={1} bg="$background">
        {/* Workout Info Header with Start Button */}
        <XStack
          items="center"
          gap="$3"
          px="$4"
          pt="$3"
          pb="$3"
          bg="$background"
        >
          <YStack flex={1} overflow="hidden">
            <Text
              fontSize="$7"
              fontWeight="700"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {template.name}
            </Text>
            <Text color="$color10" fontSize="$2">
              {template.exercises.length} exercises • ~{template.estimatedDurationMinutes} min
            </Text>
          </YStack>
          {isPhaseUnlocked && !isCompleted && (
            <Button
              size="$4"
              bg={intensityColor}
              color="white"
              onPress={startWorkout}
              icon={isStarting ? undefined : Play}
              fontWeight="600"
              disabled={isStarting}
            >
              {isStarting ? '...' : 'Start'}
            </Button>
          )}
          {isPhaseUnlocked && isCompleted && (
            <Button
              size="$4"
              bg="$color4"
              borderWidth={2}
              borderColor="$primary"
              color="$primary"
              onPress={startWorkout}
              icon={isStarting ? undefined : RotateCcw}
              fontWeight="600"
              disabled={isStarting}
            >
              {isStarting ? '...' : 'Redo'}
            </Button>
          )}
        </XStack>

        {/* Exercise/Review List */}
        <View style={styles.listContainer}>
          {isCompleted && viewMode === "review" && lastCompletedSession?.exercises ? (
            // Performance Review Mode - show completed exercise data
            <FlatList
              data={lastCompletedSession.exercises}
              keyExtractor={reviewKeyExtractor}
              renderItem={renderReviewItem}
              ListHeaderComponent={ListHeader}
              ListFooterComponent={ListFooter}
              contentContainerStyle={styles.contentContainer}
              style={styles.flatList}
              contentInsetAdjustmentBehavior="automatic"
            />
          ) : (
            // Exercise Preview Mode - draggable list
            <DraggableFlatList
              data={orderedExercises as ExerciseItem[]}
              onDragEnd={handleDragEnd}
              keyExtractor={keyExtractor}
              renderItem={renderExerciseItem}
              ListHeaderComponent={ListHeader}
              ListFooterComponent={ListFooter}
              contentContainerStyle={styles.contentContainer}
              containerStyle={styles.flatList}
              activationDistance={10}
              onDragBegin={triggerHaptic}
              contentInsetAdjustmentBehavior="automatic"
            />
          )}
        </View>
      </YStack>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
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
