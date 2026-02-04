import { useRef } from 'react'
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { Animated, PanResponder, Dimensions } from 'react-native'
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
const SWIPE_THRESHOLD = 50

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

/**
 * CalendarMonthView - Month-based calendar view
 *
 * Shows a full month grid with compact workout indicators.
 * Supports swipe gestures and arrow buttons to change months.
 * Tap on a day to see week view.
 */
export function CalendarMonthView({
  calendarData,
  currentMonth,
  onMonthChange,
  onDayPress,
}: CalendarMonthViewProps) {
  const today = new Date()
  const currentYear = currentMonth.getFullYear()
  const currentMonthNum = currentMonth.getMonth()

  const calendarDays = getMonthCalendarDays(currentYear, currentMonthNum)

  // Split days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const isCurrentMonthVisible =
    currentYear === today.getFullYear() && currentMonthNum === today.getMonth()

  const handlePreviousMonth = () => {
    onMonthChange(new Date(currentYear, currentMonthNum - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(currentYear, currentMonthNum + 1, 1))
  }

  const handleGoToToday = () => {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  // Swipe gesture handling
  const panX = useRef(new Animated.Value(0)).current

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx)
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          handlePreviousMonth()
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          handleNextMonth()
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start()
      },
    })
  ).current

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

      {/* Calendar grid with swipe */}
      <Animated.View
        style={{ flex: 1, transform: [{ translateX: panX }] }}
        {...panResponder.panHandlers}
      >
        <ScrollView flex={1} px="$2">
          <YStack gap="$0.5">
            {weeks.map((week, weekIdx) => (
              <XStack key={weekIdx}>
                {week.map((date) => {
                  const dateISO = formatDateISO(date)
                  const dayData = calendarData[dateISO]
                  const isMonthDate = date.getMonth() === currentMonthNum
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
        </ScrollView>
      </Animated.View>
    </YStack>
  )
}
