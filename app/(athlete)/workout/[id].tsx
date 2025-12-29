import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
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
  const { id, intensity: urlIntensity } = useLocalSearchParams<{ id: string; intensity?: string }>()
  const { user } = useAuth()

  // All hooks must be called before any early returns
  const [isStarting, setIsStarting] = useState(false)
  
  // Intensity selection for workout scaling (persisted in URL)
  const validIntensities = ["Low", "Moderate", "High"] as const
  const initialIntensity = validIntensities.includes(urlIntensity as any) 
    ? (urlIntensity as "Low" | "Moderate" | "High") 
    : "Moderate"
  const [selectedIntensity, setSelectedIntensityState] = useState<"Low" | "Moderate" | "High">(initialIntensity)
  
  // Update URL when intensity changes (persists on refresh)
  const setSelectedIntensity = useCallback((intensity: "Low" | "Moderate" | "High") => {
    setSelectedIntensityState(intensity)
    router.setParams({ intensity })
  }, [router])

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

  // Get the template with intensity scaling applied
  const templateQuery = useQuery(
    api.programTemplates.getWorkoutWithIntensity,
    id ? { templateId: id as Id<"program_templates">, intensity: selectedIntensity } : "skip"
  )
  
  // Keep previous template data while loading new intensity to prevent flicker
  const lastTemplateRef = useRef(templateQuery)
  useEffect(() => {
    if (templateQuery !== undefined) {
      lastTemplateRef.current = templateQuery
    }
  }, [templateQuery])
  
  // Use the last valid template (prevents flicker during intensity changes)
  const template = templateQuery === undefined ? lastTemplateRef.current : templateQuery

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
      if (todayWorkout && todayWorkout._id !== template._id) {
        await setTodayFocus({ templateId: template._id })
      }
      
      // Pass custom exercise order and intensity
      const result = await startSession({
        templateId: template._id,
        exerciseOrder: hasCustomOrder ? orderIndices : undefined,
        targetIntensity: selectedIntensity,
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
  }, [isStarting, template, startSession, router, hasCustomOrder, orderIndices, todayWorkout, setTodayFocus, selectedIntensity])

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
          />
        </ScaleDecorator>
      )
    },
    [expandedExerciseIds, toggleExpanded, canReorder]
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

        {/* Intensity Selector */}
        {isPhaseUnlocked && !isCompleted && (
          <Card p="$3" bg="$gray2" borderColor="$gray6">
            <YStack gap="$3">
              <Text fontSize="$3" fontWeight="600" color="$color12">
                Workout Intensity
              </Text>
              <XStack gap="$2">
                <Card
                  flex={1}
                  p="$3"
                  bg={selectedIntensity === "Low" ? "$green9" : "$gray4"}
                  borderColor={selectedIntensity === "Low" ? "$green10" : "$gray6"}
                  borderWidth={selectedIntensity === "Low" ? 2 : 1}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => setSelectedIntensity("Low")}
                  cursor="pointer"
                >
                  <YStack items="center" gap="$1">
                    <Text 
                      fontSize="$4" 
                      fontWeight={selectedIntensity === "Low" ? "700" : "500"}
                      color={selectedIntensity === "Low" ? "white" : "$color11"}
                    >
                      Low
                    </Text>
                    <Text 
                      fontSize="$1" 
                      color={selectedIntensity === "Low" ? "white" : "$color10"}
                      opacity={selectedIntensity === "Low" ? 0.9 : 0.7}
                    >
                      RPE 5-6
                    </Text>
                  </YStack>
                </Card>
                <Card
                  flex={1}
                  p="$3"
                  bg={selectedIntensity === "Moderate" ? "$yellow9" : "$gray4"}
                  borderColor={selectedIntensity === "Moderate" ? "$yellow10" : "$gray6"}
                  borderWidth={selectedIntensity === "Moderate" ? 2 : 1}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => setSelectedIntensity("Moderate")}
                  cursor="pointer"
                >
                  <YStack items="center" gap="$1">
                    <Text 
                      fontSize="$4" 
                      fontWeight={selectedIntensity === "Moderate" ? "700" : "500"}
                      color={selectedIntensity === "Moderate" ? "black" : "$color11"}
                    >
                      Moderate
                    </Text>
                    <Text 
                      fontSize="$1" 
                      color={selectedIntensity === "Moderate" ? "black" : "$color10"}
                      opacity={selectedIntensity === "Moderate" ? 0.8 : 0.7}
                    >
                      RPE 6-7
                    </Text>
                  </YStack>
                </Card>
                <Card
                  flex={1}
                  p="$3"
                  bg={selectedIntensity === "High" ? "$red9" : "$gray4"}
                  borderColor={selectedIntensity === "High" ? "$red10" : "$gray6"}
                  borderWidth={selectedIntensity === "High" ? 2 : 1}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => setSelectedIntensity("High")}
                  cursor="pointer"
                >
                  <YStack items="center" gap="$1">
                    <Text 
                      fontSize="$4" 
                      fontWeight={selectedIntensity === "High" ? "700" : "500"}
                      color={selectedIntensity === "High" ? "white" : "$color11"}
                    >
                      High
                    </Text>
                    <Text 
                      fontSize="$1" 
                      color={selectedIntensity === "High" ? "white" : "$color10"}
                      opacity={selectedIntensity === "High" ? 0.9 : 0.7}
                    >
                      RPE 8-9
                    </Text>
                  </YStack>
                </Card>
              </XStack>
            </YStack>
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
  }, [template, isPhaseUnlocked, isCompleted, canReorder, selectedIntensity, setSelectedIntensity])

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
