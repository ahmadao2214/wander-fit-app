import { YStack, XStack, Text, Button, Card, ScrollView } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { CalendarDayCell } from './CalendarDayCell'
import { CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import {
  getWeekDays,
  formatWeekRange,
  addDays,
  isSameDay,
  formatDateISO,
} from '../../lib/calendarUtils'
import type { Phase } from '../../types'

export interface CalendarWorkout {
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
}

export interface CalendarWeekViewProps {
  /**
   * Calendar data keyed by ISO date string
   */
  calendarData: Record<
    string,
    {
      date: string
      workouts: CalendarWorkout[]
    }
  >
  /**
   * Currently viewed week (any date within that week)
   */
  currentWeek: Date
  /**
   * Callback when week changes
   */
  onWeekChange: (newWeek: Date) => void
  /**
   * Callback when a workout is pressed
   */
  onWorkoutPress?: (templateId: string) => void
  /**
   * Callback when a workout is long pressed (for drag)
   */
  onWorkoutLongPress?: (templateId: string) => void
}

/**
 * CalendarWeekView - Week-based calendar view
 *
 * Shows 7 days in a horizontal row with workout cards.
 * Navigation arrows to move between weeks.
 */
export function CalendarWeekView({
  calendarData,
  currentWeek,
  onWeekChange,
  onWorkoutPress,
  onWorkoutLongPress,
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(currentWeek)
  const today = new Date()

  const handlePreviousWeek = () => {
    onWeekChange(addDays(currentWeek, -7))
  }

  const handleNextWeek = () => {
    onWeekChange(addDays(currentWeek, 7))
  }

  const handleGoToToday = () => {
    onWeekChange(today)
  }

  // Check if current week contains today
  const isCurrentWeekVisible = weekDays.some((d) => isSameDay(d, today))

  return (
    <YStack flex={1} gap="$3">
      {/* Navigation header */}
      <XStack items="center" justify="space-between" px="$2">
        <Button
          size="$3"
          circular
          chromeless
          icon={ChevronLeft}
          onPress={handlePreviousWeek}
        />

        <XStack items="center" gap="$2">
          <Text fontSize="$5" fontWeight="600" color="$color12">
            {formatWeekRange(currentWeek)}
          </Text>
          {!isCurrentWeekVisible && (
            <Button
              size="$2"
              chromeless
              onPress={handleGoToToday}
              color="$primary"
            >
              Today
            </Button>
          )}
        </XStack>

        <Button
          size="$3"
          circular
          chromeless
          icon={ChevronRight}
          onPress={handleNextWeek}
        />
      </XStack>

      {/* Phase legend */}
      <XStack justify="center" gap="$4" pb="$2">
        <XStack items="center" gap="$1">
          <YStack width={8} height={8} rounded="$10" bg="$blue9" />
          <Text fontSize={11} color="$color10">
            GPP
          </Text>
        </XStack>
        <XStack items="center" gap="$1">
          <YStack width={8} height={8} rounded="$10" bg="$orange9" />
          <Text fontSize={11} color="$color10">
            SPP
          </Text>
        </XStack>
        <XStack items="center" gap="$1">
          <YStack width={8} height={8} rounded="$10" bg="$green9" />
          <Text fontSize={11} color="$color10">
            SSP
          </Text>
        </XStack>
      </XStack>

      {/* Week grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <XStack flex={1} gap="$1" minWidth="100%">
          {weekDays.map((date) => {
            const dateISO = formatDateISO(date)
            const dayData = calendarData[dateISO]
            const workouts: Omit<CalendarWorkoutCardProps, 'onPress' | 'onLongPress' | 'compact'>[] =
              dayData?.workouts.map((w) => ({
                templateId: w.templateId,
                name: w.name,
                phase: w.phase,
                week: w.week,
                day: w.day,
                exerciseCount: w.exerciseCount,
                estimatedDurationMinutes: w.estimatedDurationMinutes,
                isCompleted: w.isCompleted,
                isToday: w.isToday,
                isInProgress: w.isInProgress,
              })) ?? []

            return (
              <CalendarDayCell
                key={dateISO}
                date={date}
                isToday={isSameDay(date, today)}
                workouts={workouts}
                compact={false}
                onWorkoutPress={onWorkoutPress}
                onWorkoutLongPress={onWorkoutLongPress}
              />
            )
          })}
        </XStack>
      </ScrollView>
    </YStack>
  )
}
