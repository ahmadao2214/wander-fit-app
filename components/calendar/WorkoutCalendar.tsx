import { useState } from 'react'
import { YStack, XStack, Text, Button, Spinner, Card } from 'tamagui'
import { Calendar, CalendarDays, Dumbbell } from '@tamagui/lucide-icons'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarMonthView } from './CalendarMonthView'
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
 * Fetches ALL calendar data upfront for smooth navigation without loading.
 */
export function WorkoutCalendar({
  onWorkoutPress,
  initialViewMode = 'week',
}: WorkoutCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Fetch ALL calendar data upfront - no date range filtering
  // This ensures smooth navigation without loading states when scrolling
  const fullCalendar = useQuery(api.workoutCalendar.getFullProgramCalendar)

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
              {fullCalendar.completedWorkouts} / {fullCalendar.totalWorkouts} workouts completed
            </Text>
          </XStack>
          <Text fontSize={13} fontWeight="600" color="$primary">
            {Math.round((fullCalendar.completedWorkouts / fullCalendar.totalWorkouts) * 100)}%
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
