import { useState, useMemo } from 'react'
import { YStack, XStack, Text, Button, Spinner, Card } from 'tamagui'
import { Calendar, CalendarDays, Dumbbell } from '@tamagui/lucide-icons'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarMonthView } from './CalendarMonthView'
import {
  startOfWeek,
  endOfWeek,
  formatDateISO,
  addDays,
} from '../../lib/calendarUtils'
import type { Phase } from '../../types'

type ViewMode = 'week' | 'month'

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
 * Fetches calendar data from the backend and renders appropriate view.
 */
export function WorkoutCalendar({
  onWorkoutPress,
  initialViewMode = 'week',
}: WorkoutCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculate date range for query based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      // Get current week (Sunday to Saturday)
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return {
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
      }
    } else {
      // Get current month with padding (for calendar grid)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      // Start from first day of calendar grid (might be previous month)
      const firstOfMonth = new Date(year, month, 1)
      const startPadding = firstOfMonth.getDay()
      const start = addDays(firstOfMonth, -startPadding)
      // End at last day of calendar grid (might be next month)
      const lastOfMonth = new Date(year, month + 1, 0)
      const endPadding = 6 - lastOfMonth.getDay()
      const end = addDays(lastOfMonth, endPadding)
      return {
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
      }
    }
  }, [viewMode, currentDate])

  // Fetch calendar data
  const calendarView = useQuery(api.workoutCalendar.getCalendarView, dateRange)
  const programMeta = useQuery(api.workoutCalendar.getProgramCalendarMeta)

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

  // Loading state
  if (calendarView === undefined || programMeta === undefined) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading calendar...</Text>
      </YStack>
    )
  }

  // No program state
  if (calendarView === null || programMeta === null) {
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

  // Transform calendar data for components
  const calendarData = calendarView.calendarData as Record<
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
      }>
    }
  >

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
              {programMeta.completedWorkouts} / {programMeta.totalWorkouts} workouts completed
            </Text>
          </XStack>
          <Text fontSize={13} fontWeight="600" color="$primary">
            {Math.round((programMeta.completedWorkouts / programMeta.totalWorkouts) * 100)}%
          </Text>
        </XStack>
      </Card>

      {/* Calendar view */}
      {viewMode === 'week' ? (
        <CalendarWeekView
          calendarData={calendarData}
          currentWeek={currentDate}
          onWeekChange={handleWeekChange}
          onWorkoutPress={onWorkoutPress}
        />
      ) : (
        <CalendarMonthView
          calendarData={calendarData}
          currentMonth={currentDate}
          onMonthChange={handleMonthChange}
          onDayPress={handleDayPress}
          onWorkoutPress={onWorkoutPress}
        />
      )}
    </YStack>
  )
}
