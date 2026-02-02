import { YStack, XStack, Text, Button } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { CalendarDayCell } from './CalendarDayCell'
import { CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import {
  getMonthCalendarDays,
  formatMonthYear,
  isSameDay,
  formatDateISO,
  DAY_NAMES,
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

export interface CalendarMonthViewProps {
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
   * Currently viewed month (year and month)
   */
  currentMonth: Date
  /**
   * Callback when month changes
   */
  onMonthChange: (newMonth: Date) => void
  /**
   * Callback when a day is pressed (to switch to week view)
   */
  onDayPress?: (date: Date) => void
  /**
   * Callback when a workout is pressed
   */
  onWorkoutPress?: (templateId: string) => void
}

/**
 * CalendarMonthView - Month-based calendar view
 *
 * Shows a full month grid with compact workout indicators.
 * Tap on a day to see week view.
 */
export function CalendarMonthView({
  calendarData,
  currentMonth,
  onMonthChange,
  onDayPress,
  onWorkoutPress,
}: CalendarMonthViewProps) {
  const today = new Date()
  const currentYear = currentMonth.getFullYear()
  const currentMonthNum = currentMonth.getMonth()

  const calendarDays = getMonthCalendarDays(currentYear, currentMonthNum)

  const handlePreviousMonth = () => {
    onMonthChange(new Date(currentYear, currentMonthNum - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(currentYear, currentMonthNum + 1, 1))
  }

  const handleGoToToday = () => {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  // Check if current month contains today
  const isCurrentMonthVisible =
    currentYear === today.getFullYear() && currentMonthNum === today.getMonth()

  // Split days into weeks (7 days per row)
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <YStack flex={1} gap="$3">
      {/* Navigation header */}
      <XStack items="center" justify="space-between" px="$2">
        <Button
          size="$3"
          circular
          chromeless
          icon={ChevronLeft}
          onPress={handlePreviousMonth}
        />

        <XStack items="center" gap="$2">
          <Text fontSize="$5" fontWeight="600" color="$color12">
            {formatMonthYear(currentMonth)}
          </Text>
          {!isCurrentMonthVisible && (
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
          onPress={handleNextMonth}
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

      {/* Day names header */}
      <XStack>
        {DAY_NAMES.map((day) => (
          <YStack key={day} flex={1} items="center">
            <Text fontSize={11} fontWeight="500" color="$color10">
              {day}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Calendar grid */}
      <YStack flex={1} gap="$1">
        {weeks.map((week, weekIdx) => (
          <XStack key={weekIdx} flex={1}>
            {week.map((date) => {
              const dateISO = formatDateISO(date)
              const dayData = calendarData[dateISO]
              const isCurrentMonth = date.getMonth() === currentMonthNum
              const workouts: Omit<
                CalendarWorkoutCardProps,
                'onPress' | 'onLongPress' | 'compact'
              >[] =
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
                <YStack
                  key={dateISO}
                  flex={1}
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => onDayPress?.(date)}
                >
                  <CalendarDayCell
                    date={date}
                    isToday={isSameDay(date, today)}
                    isCurrentMonth={isCurrentMonth}
                    workouts={workouts}
                    compact={true}
                  />
                </YStack>
              )
            })}
          </XStack>
        ))}
      </YStack>
    </YStack>
  )
}
