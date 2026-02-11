import { useState, useCallback, useRef } from 'react'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { Calendar, CalendarDays, Dumbbell } from '@tamagui/lucide-icons'
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
  dateISO: string // Calendar date in YYYY-MM-DD format
  layout: { x: number; y: number; width: number; height: number }
}

interface DragSource {
  phase: Phase
  week: number
  day: number
}

// Helper to format date as ISO
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null) // Target date ISO
  const [isMoving, setIsMoving] = useState(false)
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null)
  const dropZonesRef = useRef<Map<string, DropZone>>(new Map()) // key = dateISO

  // Fetch ALL calendar data upfront - no date range filtering
  // This ensures smooth navigation without loading states when scrolling
  const fullCalendar = useQuery(api.workoutCalendar.getFullProgramCalendar)
  const moveWorkoutToDate = useMutation(api.workoutCalendar.moveWorkoutToDate)

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
    setDragTargetDate(null)
    dragPositionRef.current = null
  }, [])

  // Register drop zones when day cells report their layout (now date-based)
  const handleDropZoneLayout = useCallback((
    dateISO: string,
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    dropZonesRef.current.set(dateISO, {
      dateISO,
      layout,
    })
  }, [])

  // Unregister drop zone when day cell unmounts (prevents stale zones)
  const handleDropZoneUnregister = useCallback((dateISO: string) => {
    dropZonesRef.current.delete(dateISO)
  }, [])

  const handleDragMove = useCallback((x: number, y: number) => {
    dragPositionRef.current = { x, y }

    // Find which drop zone contains this position
    let foundTargetDate: string | null = null

    for (const [, dropZone] of dropZonesRef.current) {
      const { layout, dateISO } = dropZone
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        foundTargetDate = dateISO
        break
      }
    }

    setDragTargetDate(foundTargetDate)
  }, [])

  // Handle moving workout to a new date
  const handleMoveToDate = useCallback(async (
    sourcePhase: Phase,
    sourceWeek: number,
    sourceDay: number,
    targetDateISO: string
  ) => {
    if (isMoving) return

    try {
      setIsMoving(true)
      await moveWorkoutToDate({
        sourcePhase,
        sourceWeek,
        sourceDay,
        targetDateISO,
      })
    } catch (error) {
      console.error('Failed to move workout:', error)
      // Could show a toast/alert here
    } finally {
      setIsMoving(false)
      setDragSource(null)
    }
  }, [moveWorkoutToDate, isMoving])

  const handleDragEnd = useCallback(async () => {
    const source = dragSource
    const targetDate = dragTargetDate

    // Clear drag state first
    setDragSource(null)
    setDragTargetDate(null)
    dragPositionRef.current = null

    // If we have both source and target date, move the workout
    if (source && targetDate) {
      await handleMoveToDate(
        source.phase,
        source.week,
        source.day,
        targetDate
      )
    }
  }, [dragSource, dragTargetDate, handleMoveToDate])

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
            dragTargetDate={dragTargetDate}
            dragSourceSlot={dragSource}
            gppCategoryId={gppCategoryId}
            onDropZoneLayout={handleDropZoneLayout}
            onDropZoneUnregister={handleDropZoneUnregister}
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
            dragTargetDate={dragTargetDate}
            dragSourceSlot={dragSource}
            onDropZoneLayout={handleDropZoneLayout}
            onDropZoneUnregister={handleDropZoneUnregister}
          />
        )}
      </GestureHandlerRootView>
    </YStack>
  )
}
