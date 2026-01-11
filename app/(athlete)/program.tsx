import { useState, useCallback, useMemo, ReactElement } from 'react'
import { YStack, XStack, H2, Text, Card, Button, Spinner, Popover } from 'tamagui'
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
import { Platform, TouchableOpacity, Vibration, StyleSheet, View, Pressable } from 'react-native'
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

// Union type for flat list items (headers + workouts)
type ListItem =
  | { type: 'header'; week: number; isCurrent: boolean }
  | { type: 'workout'; data: WorkoutItem }

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
  const setTodayFocusWithSwap = useMutation(api.scheduleOverrides.setTodayFocusWithSwap)
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
  // Uses atomic backend mutation to avoid race conditions between focus + swap
  const handleSetTodayFocus = useCallback(async (
    selectedWorkout: WorkoutItem
  ) => {
    if (!programState || !completedTemplateIds) return
    
    // Client-side check for UX; backend also validates to prevent bypass
    if (completedTemplateIds.includes(selectedWorkout._id)) {
      console.log('Cannot set completed workout as today focus')
      return
    }
    
    try {
      // Atomic operation: sets focus AND swaps with first incomplete slot in one transaction
      await setTodayFocusWithSwap({ 
        templateId: selectedWorkout._id,
        autoSwap: true,
      })
    } catch (error) {
      console.error('Failed to set today focus:', error)
    }
  }, [setTodayFocusWithSwap, programState, completedTemplateIds])

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

  // Flatten phase overview into a single list with week headers
  const flatListData = useMemo((): ListItem[] => {
    if (!phaseOverview) return []

    const items: ListItem[] = []

    for (const { week, workouts } of phaseOverview) {
      // Add week header
      const isCurrent = programState?.week === week && programState?.phase === selectedPhase
      items.push({ type: 'header', week, isCurrent })

      // Add workouts for this week
      for (const workout of workouts) {
        items.push({
          type: 'workout',
          data: { ...workout, week },
        })
      }
    }

    return items
  }, [phaseOverview, programState, selectedPhase])

  // Render list item (header or workout card)
  const renderListItem = useCallback(({ item, drag, isActive }: RenderItemParams<ListItem>) => {
    // Render week header (non-draggable)
    if (item.type === 'header') {
      return (
        <XStack items="center" gap="$2" pt="$4" pb="$2">
          <Text fontSize="$5" fontWeight="600" color="$gray12">
            Week {item.week}
          </Text>
          {item.isCurrent && (
            <Card bg="$green9" px="$2" py="$0.5" rounded="$10">
              <Text color="white" fontSize="$1" fontWeight="600">
                Current
              </Text>
            </Card>
          )}
        </XStack>
      )
    }

    // Render workout card
    const workout = item.data

    // Check if this workout is completed
    const isCompleted = completedTemplateIds?.includes(workout._id) ?? false

    // Check if this is today's workout
    // Priority: 1) Explicit focus override, 2) First incomplete in current week
    const isTodayFocusOverride = scheduleOverride?.todayFocusTemplateId === workout._id
    const isFirstIncomplete = workout._id === firstIncompleteWorkoutId

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
      <ScaleDecorator activeScale={1.02}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/(athlete)/workout/${workout._id}`)}
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
              <Pressable
                onLongPress={isCompleted ? undefined : drag}
                delayLongPress={100}
                disabled={isActive || isCompleted}
                style={[styles.dragHandle, isCompleted && styles.dragHandleDisabled]}
              >
                <GripVertical size={20} color={isCompleted ? '$color5' : '$color9'} />
              </Pressable>

              <YStack flex={1} gap="$1">
                <XStack items="center" gap="$2">
                  <Text fontSize="$2" color="$color10" fontWeight="500">
                    W{workout.week} · DAY {workout.day}
                  </Text>
                  {isCompleted && (
                    <Card bg="$gray8" px="$2" py="$0.5" rounded="$10">
                      <XStack items="center" gap="$1">
                        <CheckCircle size={10} color="white" />
                        <Text color="white" fontSize="$1" fontWeight="600">
                          Done
                        </Text>
                      </XStack>
                    </Card>
                  )}
                  {isToday && !isCompleted && (
                    <Card bg="$green9" px="$2" py="$0.5" rounded="$10">
                      <Text color="white" fontSize="$1" fontWeight="600">
                        Today
                      </Text>
                    </Card>
                  )}
                </XStack>
                <Text fontSize="$4" fontWeight="600">
                  {workout.name}
                </Text>
                <XStack gap="$3">
                  <XStack items="center" gap="$1">
                    <Dumbbell size={14} color="$color10" />
                    <Text fontSize="$2" color="$color10">
                      {workout.exercises.length} exercises
                    </Text>
                  </XStack>
                  <XStack items="center" gap="$1">
                    <Timer size={14} color="$color10" />
                    <Text fontSize="$2" color="$color10">
                      ~{workout.estimatedDurationMinutes} min
                    </Text>
                  </XStack>
                </XStack>
              </YStack>

              {/* Set as Today button - only show if not already today's workout and not completed */}
              {!isToday && !isCompleted && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.()
                    handleSetTodayFocus(workout)
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
  }, [router, scheduleOverride?.todayFocusTemplateId, handleSetTodayFocus, completedTemplateIds, firstIncompleteWorkoutId])

  // Key extractor for flat list
  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'header') {
      return `header-${item.week}`
    }
    return item.data._id
  }, [])

  // Handle drag end - find the workouts being swapped and call handleSwap
  const handleDragEnd = useCallback(({ data, from, to }: { data: ListItem[]; from: number; to: number }) => {
    if (from === to) return

    const fromItem = flatListData[from]
    const toItem = flatListData[to]

    // Can't drag headers
    if (!fromItem || !toItem) return
    if (fromItem.type === 'header' || toItem.type === 'header') {
      setListResetKey(k => k + 1)
      return
    }

    const fromWorkout = fromItem.data
    const toWorkout = toItem.data

    // Check if either workout is completed - block swap if so
    const isFromCompleted = completedTemplateIds?.includes(fromWorkout._id) ?? false
    const isToCompleted = completedTemplateIds?.includes(toWorkout._id) ?? false

    if (isFromCompleted || isToCompleted) {
      // Force list to reset to original order
      setListResetKey(k => k + 1)
      console.log('Swap blocked: cannot reorder completed workouts')
      return
    }

    triggerHaptic()
    handleSwap(fromWorkout, toWorkout)
  }, [flatListData, completedTemplateIds, triggerHaptic, handleSwap])

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']
  const isPhaseUnlocked = (phase: Phase) =>
    (unlockedPhases?.phases as readonly Phase[] | undefined)?.includes(phase) ?? false

  // List header component (header, phase tabs, phase description)
  const ListHeader = useMemo((): ReactElement => (
    <YStack gap="$4" pb="$2">
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
      <Card p="$4" bg="$color2" borderColor="$borderColor" borderWidth={1}>
        <YStack gap="$2">
          <Text fontSize={16} fontFamily="$body" fontWeight="600" color="$color12">
            {PHASE_NAMES[selectedPhase]}
          </Text>
          <Text fontSize={14} fontFamily="$body" color="$color10" lineHeight={22}>
            {PHASE_DESCRIPTIONS[selectedPhase]}
          </Text>
          {!isPhaseUnlocked(selectedPhase) && (
            <XStack items="center" gap="$2" pt="$2">
              <Lock size={16} color="$yellow10" />
              <Text fontSize={13} fontFamily="$body" color="$yellow10">
                Complete {selectedPhase === 'SPP' ? 'GPP' : 'SPP'} to unlock this phase
              </Text>
            </XStack>
          )}
        </YStack>
      </Card>

      {/* Locked Phase Message - show when phase is locked */}
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
  ), [menuOpen, isResetting, selectedPhase, unlockedPhases])

  // Empty state component
  const ListEmpty = useMemo((): ReactElement | null => {
    if (!isPhaseUnlocked(selectedPhase)) return null
    return (
      <Card p="$6" bg="$gray2">
        <YStack items="center" gap="$2">
          <Dumbbell size={32} color="$gray8" />
          <Text color="$color10">
            No workouts found for this phase.
          </Text>
        </YStack>
      </Card>
    )
  }, [selectedPhase, unlockedPhases])

  if (authLoading || !unlockedPhases) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text>Loading training block...</Text>
      </YStack>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YStack flex={1} bg="$background">
        <DraggableFlatList
          key={`${selectedPhase}-${listResetKey}`}
          data={isPhaseUnlocked(selectedPhase) ? flatListData : []}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          onDragBegin={() => triggerHaptic()}
          onDragEnd={handleDragEnd}
          activationDistance={10}
          containerStyle={styles.flatList}
          contentContainerStyle={styles.contentContainer}
        />
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
  flatList: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  todayButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
})
