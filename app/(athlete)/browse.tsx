import { useState, useCallback } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Spinner, Popover, Separator } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'expo-router'
import { 
  Lock,
  Unlock,
  ChevronRight,
  Dumbbell,
  Timer,
  GripVertical,
  MoreVertical,
  RotateCcw,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES, type Phase } from '../../types'
import { Platform, TouchableOpacity, Vibration, StyleSheet, View } from 'react-native'
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { Id } from 'convex/_generated/dataModel'

/**
 * Phase descriptions - full names with context
 */
const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  GPP: 'General Physical Preparedness Phase - Build the foundation for your overall fitness, movement quality, and work capacity.',
  SPP: 'Sport Physical Preparedness Phase - Develop sport-specific movements and capacities that transfer to your sport demands.',
  SSP: 'Sport Specific Preparedness Phase - Final preparation to maintain fitness while peaking for your competitive season.',
}

// Workout item type for drag operations
interface WorkoutItem {
  _id: Id<'program_templates'>
  name: string
  day: number
  week: number
  exercises: { exerciseId: Id<'exercises'> }[]
  estimatedDurationMinutes: number
}

/**
 * Browse Tab - Phase Browser with Drag-and-Drop Reordering
 * 
 * OPEN ACCESS: Athletes can freely choose ANY workout within unlocked phases.
 * REORDERING: Athletes can drag-and-drop to swap workouts within the same phase.
 * 
 * SEQUENTIAL UNLOCK: GPP always unlocked, SPP unlocks after GPP completion,
 * SSP unlocks after SPP completion.
 */
export default function BrowsePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedPhase, setSelectedPhase] = useState<Phase>('GPP')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Get unlocked phases
  const unlockedPhases = useQuery(
    api.userPrograms.getUnlockedPhases,
    user ? {} : "skip"
  )

  // Get current program state for context
  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  // Get phase overview for selected phase WITH schedule overrides applied
  const phaseOverview = useQuery(
    api.scheduleOverrides.getPhaseOverviewWithOverrides,
    programState && (unlockedPhases?.phases as readonly Phase[] | undefined)?.includes(selectedPhase) ? {
      phase: selectedPhase as "GPP" | "SPP" | "SSP",
    } : "skip"
  )

  // Mutations for schedule overrides
  const swapWorkouts = useMutation(api.scheduleOverrides.swapWorkouts)
  const resetPhaseToDefault = useMutation(api.scheduleOverrides.resetPhaseToDefault)

  // Handle workout swap via drag-and-drop
  const handleSwap = useCallback(async (
    fromWorkout: WorkoutItem,
    toWorkout: WorkoutItem
  ) => {
    if (fromWorkout._id === toWorkout._id) return

    try {
      await swapWorkouts({
        slotA: {
          phase: selectedPhase,
          week: fromWorkout.week,
          day: fromWorkout.day,
        },
        slotB: {
          phase: selectedPhase,
          week: toWorkout.week,
          day: toWorkout.day,
        },
      })
    } catch (error) {
      console.error('Failed to swap workouts:', error)
    }
  }, [selectedPhase, swapWorkouts])

  // Handle reset to default
  const handleResetPhase = async () => {
    setIsResetting(true)
    try {
      await resetPhaseToDefault({ phase: selectedPhase })
      setMenuOpen(false)
    } catch (error) {
      console.error('Failed to reset phase:', error)
    } finally {
      setIsResetting(false)
    }
  }

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }, [])

  // Render a draggable workout card - defined before early return to follow hooks rules
  const renderWorkoutCard = useCallback(({ item, drag, isActive }: RenderItemParams<WorkoutItem>) => (
    <ScaleDecorator activeScale={1.03}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(athlete)/workout/${item._id}`)}
        disabled={isActive}
      >
        <Card
          p="$4"
          mb="$2"
          bg={isActive ? '$green2' : '$background'}
          borderColor={isActive ? '$green7' : '$gray6'}
          borderWidth={isActive ? 2 : 1}
          opacity={isActive ? 0.95 : 1}
          elevate={isActive}
        >
          <XStack items="center" gap="$3">
            {/* Drag Handle */}
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={100}
              disabled={isActive}
              style={styles.dragHandle}
            >
              <GripVertical size={20} color="$gray8" />
            </TouchableOpacity>
          
            <YStack flex={1} gap="$1">
              <Text fontSize="$2" color="$color10" fontWeight="500">
                DAY {item.day}
              </Text>
              <Text fontSize="$4" fontWeight="600">
                {item.name}
              </Text>
              <XStack gap="$3">
                <XStack items="center" gap="$1">
                  <Dumbbell size={14} color="$color10" />
                  <Text fontSize="$2" color="$color10">
                    {item.exercises.length} exercises
                  </Text>
                </XStack>
                <XStack items="center" gap="$1">
                  <Timer size={14} color="$color10" />
                  <Text fontSize="$2" color="$color10">
                    ~{item.estimatedDurationMinutes} min
                  </Text>
                </XStack>
              </XStack>
            </YStack>
            <ChevronRight size={20} color="$gray8" />
          </XStack>
        </Card>
      </TouchableOpacity>
    </ScaleDecorator>
  ), [router, triggerHaptic])

  if (authLoading || !unlockedPhases) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text>Loading training block...</Text>
      </YStack>
    )
  }

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']
  const isPhaseUnlocked = (phase: Phase) => 
    (unlockedPhases.phases as readonly Phase[]).includes(phase)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YStack flex={1} bg="$background">
        <ScrollView flex={1}>
          <YStack
            gap="$4"
            px="$4"
            pt="$6"
            pb="$8"
            maxW={800}
            width="100%"
            self="center"
          >
            {/* Header with Menu */}
            <XStack justify="space-between" items="center">
              <YStack gap="$1">
                <H2>Training Block</H2>
                <Text color="$color11">
                  Hold and drag to reorder workouts
                </Text>
              </YStack>

              {/* Options Menu */}
              <Popover open={menuOpen} onOpenChange={setMenuOpen} placement="bottom-end">
                <Popover.Trigger asChild>
                  <Button
                    size="$3"
                    circular
                    chromeless
                    icon={<MoreVertical size={20} />}
                  />
                </Popover.Trigger>
                <Popover.Content
                  bg="$background"
                  borderColor="$gray6"
                  borderWidth={1}
                  p="$2"
                  elevate
                >
                  <YStack gap="$1">
                    <Button
                      size="$3"
                      chromeless
                      icon={<RotateCcw size={16} />}
                      onPress={handleResetPhase}
                      disabled={isResetting}
                    >
                      Reset {selectedPhase} to Default
                    </Button>
                  </YStack>
                </Popover.Content>
              </Popover>
            </XStack>

            {/* Phase Tabs */}
            <XStack gap="$2">
              {phases.map((phase) => {
                const unlocked = isPhaseUnlocked(phase)
                const isSelected = selectedPhase === phase
                
                return (
                  <Button
                    key={phase}
                    flex={1}
                    size="$4"
                    bg={isSelected ? (unlocked ? '$green9' : '$gray6') : '$gray3'}
                    color={isSelected ? 'white' : (unlocked ? '$gray12' : '$gray9')}
                    borderColor={unlocked ? '$green7' : '$gray6'}
                    borderWidth={1}
                    opacity={unlocked ? 1 : 0.6}
                    icon={unlocked ? Unlock : Lock}
                    onPress={() => unlocked && setSelectedPhase(phase)}
                    disabled={!unlocked}
                  >
                    {phase}
                  </Button>
                )
              })}
            </XStack>

            {/* Phase Description */}
            <Card p="$4" bg="$gray2" borderColor="$gray6">
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600">
                  {PHASE_NAMES[selectedPhase]}
                </Text>
                <Text fontSize="$3" color="$color11">
                  {PHASE_DESCRIPTIONS[selectedPhase]}
                </Text>
                {!isPhaseUnlocked(selectedPhase) && (
                  <XStack items="center" gap="$2" pt="$2">
                    <Lock size={16} color="orange" />
                    <Text fontSize="$2" color="orange">
                      Complete {selectedPhase === 'SPP' ? 'GPP' : 'SPP'} to unlock this phase
                    </Text>
                  </XStack>
                )}
              </YStack>
            </Card>

            {/* Weeks with Draggable Workouts */}
            {isPhaseUnlocked(selectedPhase) && phaseOverview && (
              <YStack gap="$4">
                {phaseOverview.map(({ week, workouts }) => {
                  // Add week info to each workout for swap operations
                  const workoutsWithWeek: WorkoutItem[] = workouts.map(w => ({
                    ...w,
                    week,
                  }))

                  return (
                    <YStack key={week} gap="$3">
                      <XStack items="center" gap="$2">
                        <Text fontSize="$5" fontWeight="600" color="$gray12">
                          Week {week}
                        </Text>
                        {programState?.week === week && programState?.phase === selectedPhase && (
                          <Card bg="$green9" px="$2" py="$0.5" borderRadius="$10">
                            <Text color="white" fontSize="$1" fontWeight="600">
                              Current
                            </Text>
                          </Card>
                        )}
                      </XStack>
                      
                      <View style={styles.listContainer}>
                        <DraggableFlatList
                          data={workoutsWithWeek}
                          keyExtractor={(item) => item._id}
                          renderItem={renderWorkoutCard}
                          onDragBegin={() => triggerHaptic()}
                          onDragEnd={({ data, from, to }) => {
                            if (from !== to && data[from] && data[to]) {
                              triggerHaptic()
                              const originalFrom = workoutsWithWeek[from]
                              const originalTo = workoutsWithWeek[to]
                              if (originalFrom && originalTo) {
                                handleSwap(originalFrom, originalTo)
                              }
                            }
                          }}
                          activationDistance={10}
                          scrollEnabled={false}
                        />
                      </View>
                    </YStack>
                  )
                })}

                {phaseOverview.length === 0 && (
                  <Card p="$6" bg="$gray2">
                    <YStack items="center" gap="$2">
                      <Dumbbell size={32} color="$gray8" />
                      <Text color="$color10">
                        No workouts found for this phase.
                      </Text>
                    </YStack>
                  </Card>
                )}
              </YStack>
            )}

            {/* Locked Phase Message */}
            {!isPhaseUnlocked(selectedPhase) && (
              <Card p="$6" bg="$gray2" borderColor="$gray6">
                <YStack items="center" gap="$3">
                  <Lock size={48} color="$gray8" />
                  <Text fontSize="$4" fontWeight="600" color="$color11">
                    Phase Locked
                  </Text>
                  <Text color="$color10">
                    Complete the previous phase to unlock {PHASE_NAMES[selectedPhase]}.
                  </Text>
                </YStack>
              </Card>
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  dragHandle: {
    padding: 4,
    marginLeft: -4,
  },
  listContainer: {
    flex: 1,
  },
})
