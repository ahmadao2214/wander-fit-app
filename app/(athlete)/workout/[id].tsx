import { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { 
  YStack, 
  XStack, 
  H3,
  Text, 
  Card, 
  Button,
  Spinner 
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useDragReorder } from '../../../hooks/useDragReorder'
import { Id } from '../../../convex/_generated/dataModel'
import { 
  ArrowLeft, 
  Play, 
  Lock,
  CheckCircle,
} from '@tamagui/lucide-icons'
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ExerciseAccordionItem } from '../../../components/ExerciseAccordionItem'

/**
 * Exercise type for the draggable list
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

  // All hooks must be called before any early returns
  const [isStarting, setIsStarting] = useState(false)

  // Safe back navigation - avoids getting stuck in execution screens
  const handleBack = useCallback(() => {
    // Use dismiss if available (pops screen from stack cleanly)
    // Falls back to navigating to Program tab as a safe default
    if (router.canDismiss()) {
      router.dismiss()
    } else {
      router.replace('/(athlete)/browse')
    }
  }, [router])
  // Track which accordions are expanded (by index)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())

  // Get the template with exercise details
  const template = useQuery(
    api.programTemplates.getByIdWithExercises,
    id ? { templateId: id as Id<"program_templates"> } : "skip"
  )

  // Get user's session for this template (to get custom exercise order)
  const session = useQuery(
    api.gppWorkoutSessions.getSessionForTemplate,
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

  // Toggle accordion expansion
  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
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
      if (todayWorkout && todayWorkout._id !== template._id) {
        await setTodayFocus({ templateId: template._id })
      }
      
      // Pass custom exercise order if user reordered exercises
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
  }, [isStarting, template, startSession, router, hasCustomOrder, orderIndices, todayWorkout, setTodayFocus])

  // Render item for DraggableFlatList
  const renderExerciseItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ExerciseItem>) => {
      const index = getIndex() ?? 0
      return (
        <ScaleDecorator activeScale={1.02}>
          <ExerciseAccordionItem
            exercise={item}
            index={index}
            isExpanded={expandedIndices.has(index)}
            onToggle={() => toggleExpanded(index)}
            drag={canReorder ? drag : undefined}
            isActive={isActive}
          />
        </ScaleDecorator>
      )
    },
    [expandedIndices, toggleExpanded, canReorder]
  )

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: ExerciseItem, index: number) => 
    `${item.exerciseId}-${index}`, [])

  // Header component for the FlatList
  const ListHeader = useMemo(() => {
    if (!template) return null
    return (
      <YStack gap="$3" pb="$3">
        {/* Phase Badge - simplified, no week/day to avoid confusion with reordering */}
        <XStack gap="$2" flexWrap="wrap">
          <Card bg="$green3" px="$3" py="$1" borderRadius="$10">
            <Text fontSize="$2" color="$green11" fontWeight="500">
              {template.phase}
            </Text>
          </Card>
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

        {/* Completed Badge */}
        {isCompleted && (
          <Card p="$3" bg="$green2" borderColor="$green7">
            <XStack items="center" gap="$2">
              <CheckCircle size={20} color="$green10" />
              <Text fontWeight="600" color="$green11">
                Workout Completed
              </Text>
            </XStack>
          </Card>
        )}

        {/* Exercise List Header */}
        <XStack items="center" justify="space-between" pt="$2">
          <H3>Exercises</H3>
          {canReorder && (
            <Text fontSize="$2" color="$color10">
              Hold to drag
            </Text>
          )}
        </XStack>
      </YStack>
    )
  }, [template, isPhaseUnlocked, isCompleted, canReorder])

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
        {/* Header with Start Button */}
        <XStack 
          items="center" 
          gap="$3" 
          px="$4" 
          pt="$6" 
          pb="$3"
          bg="$background"
        >
          <Button
            size="$3"
            variant="outlined"
            icon={ArrowLeft}
            onPress={handleBack}
            circular
          />
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
              bg="$green9"
              color="white"
              onPress={startWorkout}
              icon={isStarting ? undefined : Play}
              fontWeight="600"
              disabled={isStarting}
            >
              {isStarting ? '...' : 'Start'}
            </Button>
          )}
        </XStack>

        {/* Draggable Exercise List */}
        <View style={styles.listContainer}>
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
          />
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
