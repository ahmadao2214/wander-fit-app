import { useState, useRef, useCallback } from 'react'
import { YStack, XStack, Text, Button } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
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

const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
  calendarData: Record<
    string,
    {
      date: string
      workouts: CalendarWorkout[]
    }
  >
  currentMonth: Date
  onMonthChange: (newMonth: Date) => void
  onDayPress?: (date: Date) => void
  onWorkoutPress?: (templateId: string) => void
}

// Generate array of months around current date for swipe navigation
function generateMonths(centerDate: Date, count: number = 5): Date[] {
  const months: Date[] = []
  const halfCount = Math.floor(count / 2)

  for (let i = -halfCount; i <= halfCount; i++) {
    months.push(new Date(centerDate.getFullYear(), centerDate.getMonth() + i, 1))
  }

  return months
}

/**
 * CalendarMonthView - Month-based calendar view with swipe navigation
 *
 * Shows a full month grid with compact workout indicators.
 * Supports horizontal swipe to change months.
 * Tap on a day to see week view.
 */
export function CalendarMonthView({
  calendarData,
  currentMonth,
  onMonthChange,
  onDayPress,
  onWorkoutPress,
}: CalendarMonthViewProps) {
  const flatListRef = useRef<FlatList>(null)
  const [months] = useState(() => generateMonths(currentMonth, 13))
  const [currentIndex, setCurrentIndex] = useState(6) // Middle of 13 months

  const today = new Date()
  const displayedMonth = months[currentIndex] || currentMonth
  const currentYear = displayedMonth.getFullYear()
  const currentMonthNum = displayedMonth.getMonth()

  const isCurrentMonthVisible =
    currentYear === today.getFullYear() && currentMonthNum === today.getMonth()

  const handlePreviousMonth = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true })
    }
  }, [currentIndex])

  const handleNextMonth = useCallback(() => {
    if (currentIndex < months.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    }
  }, [currentIndex, months.length])

  const handleGoToToday = useCallback(() => {
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const index = months.findIndex(
      (m) => m.getFullYear() === todayMonth.getFullYear() && m.getMonth() === todayMonth.getMonth()
    )
    if (index >= 0) {
      flatListRef.current?.scrollToIndex({ index, animated: true })
    } else {
      onMonthChange(todayMonth)
    }
  }, [months, onMonthChange])

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const newIndex = Math.round(offsetX / SCREEN_WIDTH)
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < months.length) {
      setCurrentIndex(newIndex)
      onMonthChange(months[newIndex])
    }
  }, [currentIndex, months, onMonthChange])

  const renderMonth = useCallback(({ item: monthDate }: { item: Date }) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const calendarDays = getMonthCalendarDays(year, month)

    // Split days into weeks
    const weeks: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    return (
      <YStack width={SCREEN_WIDTH} px="$2">
        {/* Calendar grid */}
        <YStack gap="$0.5">
          {weeks.map((week, weekIdx) => (
            <XStack key={weekIdx}>
              {week.map((date) => {
                const dateISO = formatDateISO(date)
                const dayData = calendarData[dateISO]
                const isMonthDate = date.getMonth() === month
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
                      isCurrentMonth={isMonthDate}
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
  }, [calendarData, onDayPress])

  const keyExtractor = useCallback((item: Date) => `${item.getFullYear()}-${item.getMonth()}`, [])

  return (
    <YStack flex={1} gap="$2">
      {/* Navigation header */}
      <XStack alignItems="center" justifyContent="space-between" px="$2">
        <Button
          size="$2"
          circular
          chromeless
          icon={ChevronLeft}
          onPress={handlePreviousMonth}
        />

        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontWeight="600" color="$color12">
            {formatMonthYear(displayedMonth)}
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
          size="$2"
          circular
          chromeless
          icon={ChevronRight}
          onPress={handleNextMonth}
        />
      </XStack>

      {/* Phase legend - compact */}
      <XStack justifyContent="center" gap="$3">
        <XStack alignItems="center" gap="$1">
          <YStack width={6} height={6} borderRadius={10} backgroundColor="$blue9" />
          <Text fontSize={10} color="$color10">GPP</Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <YStack width={6} height={6} borderRadius={10} backgroundColor="$orange9" />
          <Text fontSize={10} color="$color10">SPP</Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <YStack width={6} height={6} borderRadius={10} backgroundColor="$green9" />
          <Text fontSize={10} color="$color10">SSP</Text>
        </XStack>
      </XStack>

      {/* Day names header */}
      <XStack px="$2">
        {DAY_NAMES.map((day) => (
          <YStack key={day} flex={1} alignItems="center">
            <Text fontSize={10} fontWeight="500" color="$color10">
              {day}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Swipeable month view */}
      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonth}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
      />
    </YStack>
  )
}
