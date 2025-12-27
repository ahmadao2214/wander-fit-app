import { useState, useCallback, useMemo } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Spinner, Popover } from 'tamagui'
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
  CalendarCheck,
  CheckCircle,
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
 * Program Tab - Training Program with Drag-and-Drop Reordering
 * 
 * OPEN ACCESS: Athletes can freely choose ANY workout within unlocked phases.
 * REORDERING: Athletes can drag-and-drop to swap workouts within the same phase.
 * 
 * SEQUENTIAL UNLOCK: GPP always unlocked, SPP unlocks after GPP completion,
 * SSP unlocks after SPP completion.
 */
export default function ProgramPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedPhase, setSelectedPhase] = useState<Phase>('GPP')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  // Key to force DraggableFlatList to reset when a swap is rejected
  const [listResetKey, setListResetKey] = useState(0)

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

  // Get current schedule override to know today's focus
  const scheduleOverride = useQuery(
    api.scheduleOverrides.getScheduleOverride,
    user ? {} : "skip"
  )

  // Get completed template IDs to show completion status
  const completedTemplateIds = useQuery(
    api.gppWorkoutSessions.getCompletedTemplateIds,
    user ? {} : "skip"
  )

  // Mutations for schedule overrides
  const swapWorkouts = useMutation(api.scheduleOverrides.swapWorkouts)
  const resetPhaseToDefault = useMutation(api.scheduleOverrides.resetPhaseToDefault)
  const setTodayFocus = useMutation(api.scheduleOverrides.setTodayFocus)
  const clearTodayFocus = useMutation(api.scheduleOverrides.clearTodayFocus)

  // Handle workout swap via drag-and-drop
  // Rules:
  // 1. Can't swap if either workout is completed (validated on backend too)
  // 2. If swap involves today's slot, clear today's focus
  const handleSwap = useCallback(async (
    fromWorkout: WorkoutItem,
    toWorkout: WorkoutItem
  ) => {
    if (fromWorkout._id === toWorkout._id) return
    
    // Client-side check for UX; backend also validates to prevent bypass
    const isFromCompleted = completedTemplateIds?.includes(fromWorkout._id) ?? false
    const isToCompleted = completedTemplateIds?.includes(toWorkout._id) ?? false
    
    if (isFromCompleted || isToCompleted) {
      console.log('Cannot swap: one or both workouts are completed')
      return
    }

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
      
      // If either slot is today's slot, clear today's focus
      // so the reordered schedule takes effect immediately
      if (programState) {
        const isTodaySlotInvolved = 
          (fromWorkout.week === programState.week && fromWorkout.day === programState.day) ||
          (toWorkout.week === programState.week && toWorkout.day === programState.day)
        
        if (isTodaySlotInvolved && programState.hasTodayFocusOverride) {
          await clearTodayFocus({})
        }
      }
      
      // Force list to re-sync with backend data after successful swap
      // This ensures DraggableFlatList's internal state matches the new order
      setListResetKey(k => k + 1)
    } catch (error) {
      console.error('Failed to swap workouts:', error)
    }
  }, [selectedPhase, swapWorkouts, programState, clearTodayFocus, completedTemplateIds])

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

  // Handle setting today's focus with auto-swap
  // When user selects a different workout for today, we:
  // 1. Set it as today's focus (backend validates completion status)
  // 2. Swap it with the FIRST INCOMPLETE workout slot (not completed ones)
  const handleSetTodayFocus = useCallback(async (
    selectedWorkout: WorkoutItem
  ) => {
    if (!programState || !phaseOverview || !completedTemplateIds) return
    
    // Client-side check for UX; backend also validates to prevent bypass
    if (completedTemplateIds.includes(selectedWorkout._id)) {
      console.log('Cannot set completed workout as today focus')
      return
    }
    
    try {
      // Set as today's focus - backend validates completion status
      await setTodayFocus({ templateId: selectedWorkout._id })
      
      // Find the first incomplete workout slot in the current week for auto-swap
      const currentWeekWorkouts = phaseOverview
        .flatMap(w => w.workouts)
        .filter(w => w.week === programState.week)
        .sort((a, b) => a.day - b.day)
      
      const firstIncompleteSlot = currentWeekWorkouts.find(
        w => !completedTemplateIds.includes(w._id)
      )
      
      // If selected workout is not already in the first incomplete slot, swap them
      if (
        firstIncompleteSlot && 
        firstIncompleteSlot._id !== selectedWorkout._id &&
        !(selectedWorkout.week === firstIncompleteSlot.week && selectedWorkout.day === firstIncompleteSlot.day)
      ) {
        await swapWorkouts({
          slotA: {
            phase: selectedPhase,
            week: selectedWorkout.week,
            day: selectedWorkout.day,
          },
          slotB: {
            phase: selectedPhase,
            week: firstIncompleteSlot.week,
            day: firstIncompleteSlot.day,
          },
        })
      }
    } catch (error) {
      console.error('Failed to set today focus:', error)
    }
  }, [setTodayFocus, swapWorkouts, programState, selectedPhase, phaseOverview, completedTemplateIds])

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }, [])

  // Find the first incomplete workout in the current week
  // This is used for "Today" indicator when the scheduled slot is already completed
  const firstIncompleteWorkoutId = useMemo(() => {
    if (!phaseOverview || !programState || !completedTemplateIds) return null
    if (selectedPhase !== programState.phase) return null
    
    // Get current week's workouts sorted by day
    const currentWeekWorkouts = phaseOverview
      .flatMap(w => w.workouts)
      .filter(w => w.week === programState.week)
      .sort((a, b) => a.day - b.day)
    
    // Find first incomplete one
    const firstIncomplete = currentWeekWorkouts.find(
      w => !completedTemplateIds.includes(w._id)
    )
    
    return firstIncomplete?._id ?? null
  }, [phaseOverview, programState, completedTemplateIds, selectedPhase])

  // Render a draggable workout card - defined before early return to follow hooks rules
  const renderWorkoutCard = useCallback(({ item, drag, isActive }: RenderItemParams<WorkoutItem>) => {
    // Check if this workout is completed
    const isCompleted = completedTemplateIds?.includes(item._id) ?? false
    
    // Check if this is today's workout
    // Priority: 1) Explicit focus override, 2) First incomplete in current week
    const isTodayFocusOverride = scheduleOverride?.todayFocusTemplateId === item._id
    const isFirstIncomplete = item._id === firstIncompleteWorkoutId
    
    // Show as "today" if: explicit focus override OR first incomplete (when viewing current phase)
    const isToday = !isCompleted && (
      isTodayFocusOverride || 
      (isFirstIncomplete && !scheduleOverride?.todayFocusTemplateId)
    )
    
    // Determine card styling based on state (priority: active > completed > today > default)
    const getCardBg = () => {
      if (isActive) return '$green2'
      if (isCompleted) return '$gray2'
      if (isToday) return '$green2'
      return '$background'
    }
    
    const getCardBorder = () => {
      if (isActive) return '$green7'
      if (isCompleted) return '$gray5'
      if (isToday) return '$green7'
      return '$gray6'
    }
    
    return (
      <ScaleDecorator activeScale={1.03}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/(athlete)/workout/${item._id}`)}
          disabled={isActive}
        >
          <Card
            p="$4"
            mb="$2"
            bg={getCardBg()}
            borderColor={getCardBorder()}
            borderWidth={isActive || isToday ? 2 : 1}
            opacity={isActive ? 0.95 : isCompleted ? 0.8 : 1}
            elevate={isActive}
          >
            <XStack items="center" gap="$3">
              {/* Drag Handle - disabled for completed workouts */}
              <TouchableOpacity
                onLongPress={isCompleted ? undefined : drag}
                delayLongPress={100}
                disabled={isActive || isCompleted}
                style={[styles.dragHandle, isCompleted && styles.dragHandleDisabled]}
              >
                <GripVertical size={20} color={isCompleted ? '$gray5' : '$gray8'} />
              </TouchableOpacity>
            
              <YStack flex={1} gap="$1">
                <XStack items="center" gap="$2">
                  <Text fontSize="$2" color="$color10" fontWeight="500">
                    DAY {item.day}
                  </Text>
                  {isCompleted && (
                    <Card bg="$gray8" px="$2" py="$0.5" borderRadius="$10">
                      <XStack items="center" gap="$1">
                        <CheckCircle size={10} color="white" />
                        <Text color="white" fontSize="$1" fontWeight="600">
                          Done
                        </Text>
                      </XStack>
                    </Card>
                  )}
                  {isToday && !isCompleted && (
                    <Card bg="$green9" px="$2" py="$0.5" borderRadius="$10">
                      <Text color="white" fontSize="$1" fontWeight="600">
                        Today
                      </Text>
                    </Card>
                  )}
                </XStack>
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
              
              {/* Set as Today button - only show if not already today's workout and not completed */}
              {!isToday && !isCompleted && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.()
                    handleSetTodayFocus(item)
                  }}
                  style={styles.todayButton}
                >
                  <CalendarCheck size={20} color="$green10" />
                </TouchableOpacity>
              )}
              
              <ChevronRight size={20} color="$gray8" />
            </XStack>
          </Card>
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [router, scheduleOverride?.todayFocusTemplateId, handleSetTodayFocus, programState, selectedPhase, completedTemplateIds, firstIncompleteWorkoutId])

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
                <H2>My Program</H2>
                <Text color="$color11">
                  Drag to reorder your workouts
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
                          key={`${week}-${listResetKey}`}
                          data={workoutsWithWeek}
                          keyExtractor={(item) => item._id}
                          renderItem={renderWorkoutCard}
                          onDragBegin={() => triggerHaptic()}
                          onDragEnd={({ from, to }) => {
                            if (from !== to) {
                              const originalFrom = workoutsWithWeek[from]
                              const originalTo = workoutsWithWeek[to]
                              
                              if (!originalFrom || !originalTo) {
                                setListResetKey(k => k + 1)
                                return
                              }
                              
                              // Check if either workout is completed - block swap if so
                              const isFromCompleted = completedTemplateIds?.includes(originalFrom._id) ?? false
                              const isToCompleted = completedTemplateIds?.includes(originalTo._id) ?? false
                              
                              if (isFromCompleted || isToCompleted) {
                                // Force list to reset to original order
                                setListResetKey(k => k + 1)
                                console.log('Swap blocked: cannot reorder completed workouts')
                                return
                              }
                              
                              triggerHaptic()
                              handleSwap(originalFrom, originalTo)
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
  dragHandleDisabled: {
    opacity: 0.4,
  },
  listContainer: {
    flex: 1,
  },
  todayButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
})
