import { useState, useCallback, useRef } from 'react'
import { YStack, XStack, Text, Button, Spinner, Card } from 'tamagui'
import { Calendar, CalendarDays, Dumbbell, ArrowLeftRight } from '@tamagui/lucide-icons'
import { useQuery, useMutation } from 'convex/react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { api } from '../../convex/_generated/api'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarMonthView } from './CalendarMonthView'
import type { Phase } from '../../types'

type ViewMode = 'week' | 'month'

interface WorkoutSlot {
  phase: Phase
  week: number
  day: number
}

interface DropZone {
  slot: WorkoutSlot
  layout: { x: number; y: number; width: number; height: number }
}

interface DragSource {
  phase: Phase
  week: number
  day: number
}

export interface WorkoutCalendarProps {
  /**
   * Callback when a workout is pressed
   */
  onWorkoutPress?: (templateId: string) => void
  /**
   * Initial view mode
   */
  initialViewMode?: ViewMode
}

/**
 * WorkoutCalendar - Main calendar component
 *
 * Provides week and month views of the workout schedule.
 * Fetches ALL calendar data upfront for smooth navigation without loading.
 */
export function WorkoutCalendar({
  onWorkoutPress,
  initialViewMode = 'week',
}: WorkoutCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dragSource, setDragSource] = useState<DragSource | null>(null)
  const [dragTarget, setDragTarget] = useState<WorkoutSlot | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null)
  const dropZonesRef = useRef<Map<string, DropZone>>(new Map())

  // Fetch ALL calendar data upfront - no date range filtering
  // This ensures smooth navigation without loading states when scrolling
  const fullCalendar = useQuery(api.workoutCalendar.getFullProgramCalendar)
  const swapWorkouts = useMutation(api.workoutCalendar.swapWorkouts)

  // Handle week navigation
  const handleWeekChange = (newWeek: Date) => {
    setCurrentDate(newWeek)
  }

  // Handle month navigation
  const handleMonthChange = (newMonth: Date) => {
    setCurrentDate(newMonth)
  }

  // Handle day press in month view (switch to week view)
  const handleDayPress = (date: Date) => {
    setCurrentDate(date)
    setViewMode('week')
  }

  // Drag-drop handlers
  const handleDragStart = useCallback((phase: Phase, week: number, day: number) => {
    setDragSource({ phase, week, day })
    setDragTarget(null)
    dragPositionRef.current = null
  }, [])

  // Register drop zones when day cells report their layout
  const handleDropZoneLayout = useCallback((
    phase: Phase,
    week: number,
    day: number,
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    const key = `${phase}-${week}-${day}`
    dropZonesRef.current.set(key, {
      slot: { phase, week, day },
      layout,
    })
  }, [])

  const handleDragMove = useCallback((x: number, y: number) => {
    dragPositionRef.current = { x, y }

    // Find which drop zone contains this position
    let foundTarget: WorkoutSlot | null = null

    for (const [, dropZone] of dropZonesRef.current) {
      const { layout, slot } = dropZone
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        foundTarget = slot
        break
      }
    }

    setDragTarget(foundTarget)
  }, [])

  // Handle workout swap - defined before handleDragEnd since it depends on this
  const handleSwap = useCallback(async (
    sourcePhase: Phase,
    sourceWeek: number,
    sourceDay: number,
    targetPhase: Phase,
    targetWeek: number,
    targetDay: number
  ) => {
    if (isSwapping) return

    try {
      setIsSwapping(true)
      await swapWorkouts({
        sourcePhase,
        sourceWeek,
        sourceDay,
        targetPhase,
        targetWeek,
        targetDay,
      })
    } catch (error) {
      console.error('Failed to swap workouts:', error)
      // Could show a toast/alert here
    } finally {
      setIsSwapping(false)
      setDragSource(null)
    }
  }, [swapWorkouts, isSwapping])

  const handleDragEnd = useCallback(async () => {
    const source = dragSource
    const target = dragTarget

    // Clear drag state first
    setDragSource(null)
    setDragTarget(null)
    dragPositionRef.current = null

    // If we have both source and target, and they're different, trigger swap
    // But only if they're in the same phase AND week (same-week constraint)
    if (
      source &&
      target &&
      source.phase === target.phase &&
      source.week === target.week &&
      source.day !== target.day
    ) {
      await handleSwap(
        source.phase,
        source.week,
        source.day,
        target.phase,
        target.week,
        target.day
      )
    }
  }, [dragSource, dragTarget, handleSwap])

  // Loading state
  if (fullCalendar === undefined) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading calendar...</Text>
      </YStack>
    )
  }

  // No program state
  if (fullCalendar === null) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" p="$6">
        <Dumbbell size={48} color="$color8" />
        <Text fontSize="$5" fontWeight="600" color="$color11">
          No Program Found
        </Text>
        <Text color="$color10" text="center">
          Complete the intake flow to create your personalized training program.
        </Text>
      </YStack>
    )
  }

  // Extract calendar data - all dates loaded upfront
  const calendarData = fullCalendar.calendarData as Record<
    string,
    {
      date: string
      workouts: Array<{
        templateId: string
        name: string
        phase: Phase
        week: number
        day: number
        exerciseCount: number
        estimatedDurationMinutes: number
        isCompleted: boolean
        isToday: boolean
        isInProgress: boolean
        isLocked: boolean // Phase not yet unlocked (visible but not draggable)
      }>
    }
  >

  // Extract category for consistent color scheme
  const gppCategoryId = fullCalendar.gppCategoryId

  return (
    <YStack flex={1} gap="$4">
      {/* View mode toggle */}
      <XStack justify="center" gap="$2">
        <Button
          size="$3"
          bg={viewMode === 'week' ? '$primary' : '$color3'}
          color={viewMode === 'week' ? 'white' : '$color11'}
          icon={CalendarDays}
          onPress={() => setViewMode('week')}
          pressStyle={{ opacity: 0.8 }}
        >
          Week
        </Button>
        <Button
          size="$3"
          bg={viewMode === 'month' ? '$primary' : '$color3'}
          color={viewMode === 'month' ? 'white' : '$color11'}
          icon={Calendar}
          onPress={() => setViewMode('month')}
          pressStyle={{ opacity: 0.8 }}
        >
          Month
        </Button>
      </XStack>

      {/* Progress summary */}
      <Card p="$3" bg="$color2" borderColor="$borderColor" borderWidth={1}>
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Dumbbell size={16} color="$primary" />
            <Text fontSize={13} color="$color11">
              {fullCalendar.completedWorkouts} / {fullCalendar.totalWorkouts} workouts completed
            </Text>
          </XStack>
          <Text fontSize={13} fontWeight="600" color="$primary">
            {Math.round((fullCalendar.completedWorkouts / fullCalendar.totalWorkouts) * 100)}%
          </Text>
        </XStack>
      </Card>

      {/* Calendar view */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {viewMode === 'week' ? (
          <CalendarWeekView
            calendarData={calendarData}
            currentWeek={currentDate}
            onWeekChange={handleWeekChange}
            onWorkoutPress={onWorkoutPress}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            dragTargetSlot={dragTarget}
            dragSourceSlot={dragSource}
            gppCategoryId={gppCategoryId}
            onDropZoneLayout={handleDropZoneLayout}
          />
        ) : (
          <CalendarMonthView
            calendarData={calendarData}
            currentMonth={currentDate}
            onMonthChange={handleMonthChange}
            onDayPress={handleDayPress}
            onWorkoutPress={onWorkoutPress}
            gppCategoryId={gppCategoryId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            dragTargetSlot={dragTarget}
            dragSourceSlot={dragSource}
            onDropZoneLayout={handleDropZoneLayout}
          />
        )}
      </GestureHandlerRootView>
    </YStack>
  )
}
