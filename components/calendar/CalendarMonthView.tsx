import { useRef, useMemo, useCallback } from 'react'
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { Animated, PanResponder, Dimensions } from 'react-native'
import { CalendarDayCell } from './CalendarDayCell'
import { CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import {
  getMonthCalendarDays,
  formatMonthYear,
  isSameDay,
  isSameWeek,
  formatDateISO,
  DAY_NAMES,
  parseDateISO,
  addDays,
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
  exercisePreview?: string[] // First 3 exercise names for preview
}

const LAST_WEEK_BUFFER_DAYS = 7 // Allow last week workouts to be moved up to 7 days forward

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
  /** Category ID for color coding (1-4) */
  gppCategoryId?: number
  /** Drag callbacks for swapping */
  onDragStart?: (phase: Phase, week: number, day: number) => void
  onDragEnd?: () => void
  onDragMove?: (x: number, y: number) => void
  /** Current drag target date for highlighting (ISO format) */
  dragTargetDate?: string | null
  /** Current drag source slot */
  dragSourceSlot?: { phase: Phase; week: number; day: number } | null
  /** Callback to register drop zones (date-based) */
  onDropZoneLayout?: (dateISO: string, layout: { x: number; y: number; width: number; height: number }) => void
  /** Callback to unregister drop zones on unmount */
  onDropZoneUnregister?: (dateISO: string) => void
  /** Program start date (ISO format) - limits navigation */
  programStartDate?: string
  /** Program end date (ISO format) - limits navigation */
  programEndDate?: string
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
  onWorkoutPress,
  gppCategoryId,
  onDragStart,
  onDragEnd,
  onDragMove,
  dragTargetDate,
  dragSourceSlot,
  onDropZoneLayout,
  onDropZoneUnregister,
  programStartDate,
  programEndDate,
}: CalendarMonthViewProps) {
  const today = new Date()
  const currentYear = currentMonth.getFullYear()
  const currentMonthNum = currentMonth.getMonth()

  const calendarDays = getMonthCalendarDays(currentYear, currentMonthNum)

  // Check if today is within program bounds
  const isTodayInProgram = (() => {
    if (!programStartDate || !programEndDate) return true
    const start = parseDateISO(programStartDate)
    const endWithBuffer = addDays(parseDateISO(programEndDate), LAST_WEEK_BUFFER_DAYS)
    return today >= start && today <= endWithBuffer
  })()

  // Calculate navigation bounds
  const programStart = programStartDate ? parseDateISO(programStartDate) : null
  const programEnd = programEndDate ? addDays(parseDateISO(programEndDate), LAST_WEEK_BUFFER_DAYS) : null

  // Check if current month is at navigation bounds
  const isFirstMonth = programStart
    ? currentYear === programStart.getFullYear() && currentMonthNum === programStart.getMonth()
    : false
  const isLastMonth = programEnd
    ? currentYear === programEnd.getFullYear() && currentMonthNum === programEnd.getMonth()
    : false

  // Split days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const isCurrentMonthVisible =
    currentYear === today.getFullYear() && currentMonthNum === today.getMonth()

  const handlePreviousMonth = useCallback(() => {
    if (!isFirstMonth) {
      onMonthChange(new Date(currentYear, currentMonthNum - 1, 1))
    }
  }, [isFirstMonth, onMonthChange, currentYear, currentMonthNum])

  const handleNextMonth = useCallback(() => {
    if (!isLastMonth) {
      onMonthChange(new Date(currentYear, currentMonthNum + 1, 1))
    }
  }, [isLastMonth, onMonthChange, currentYear, currentMonthNum])

  const handleGoToToday = useCallback(() => {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
  }, [onMonthChange, today])

  // Swipe gesture handling
  const panX = useRef(new Animated.Value(0)).current

  // Create pan responder with bound checks (recreated when bounds change)
  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit swipe if at bounds
        if (isFirstMonth && gestureState.dx > 0) {
          // At first month, limit right swipe (to go back)
          panX.setValue(gestureState.dx * 0.3)
        } else if (isLastMonth && gestureState.dx < 0) {
          // At last month, limit left swipe (to go forward)
          panX.setValue(gestureState.dx * 0.3)
        } else {
          panX.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD && !isFirstMonth) {
          handlePreviousMonth()
        } else if (gestureState.dx < -SWIPE_THRESHOLD && !isLastMonth) {
          handleNextMonth()
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start()
      },
    }),
  [isFirstMonth, isLastMonth, handlePreviousMonth, handleNextMonth, panX])

  return (
    <YStack flex={1} gap="$2">
      {/* Navigation header */}
      <XStack alignItems="center" justifyContent="space-between" px="$2">
        {/* Previous arrow - hidden at first month of program */}
        {isFirstMonth ? (
          <YStack width={32} height={32} />
        ) : (
          <Button
            size="$2"
            circular
            chromeless
            icon={ChevronLeft}
            onPress={handlePreviousMonth}
          />
        )}

        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontWeight="600" color="$color12">
            {formatMonthYear(currentMonth)}
          </Text>
          {!isCurrentMonthVisible && isTodayInProgram && (
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

        {/* Next arrow - hidden at last month of program */}
        {isLastMonth ? (
          <YStack width={32} height={32} />
        ) : (
          <Button
            size="$2"
            circular
            chromeless
            icon={ChevronRight}
            onPress={handleNextMonth}
          />
        )}
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
            {(() => {
              // Find the source workout's effective date when dragging
              const isDragActive = dragSourceSlot !== null
              let sourceEffectiveDate: Date | null = null

              if (isDragActive && dragSourceSlot) {
                for (const [dateKey, dayData] of Object.entries(calendarData)) {
                  const workout = dayData.workouts.find(
                    w => w.phase === dragSourceSlot.phase &&
                         w.week === dragSourceSlot.week &&
                         w.day === dragSourceSlot.day
                  )
                  if (workout) {
                    sourceEffectiveDate = parseDateISO(dateKey)
                    break
                  }
                }
              }

              return weeks.map((week, weekIdx) => (
                <XStack key={weekIdx}>
                  {week.map((date) => {
                    const dateISO = formatDateISO(date)
                    const dayData = calendarData[dateISO]
                    const isMonthDate = date.getMonth() === currentMonthNum
                    const workouts = dayData?.workouts.map((w) => ({
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
                      gppCategoryId,
                      // Add slot info for drag-drop
                      slotPhase: w.phase,
                      slotWeek: w.week,
                      slotDay: w.day,
                    })) ?? []

                    // Check if hovering over this cell
                    const isDropTarget = dragTargetDate === dateISO && dragSourceSlot !== null

                    // Check if this date is a valid drop target:
                    // 1. Must be same week as source
                    // 2. Cannot be in the past (before today)
                    const isInPast = date < today && !isSameDay(date, today)
                    const isValidDropTarget = sourceEffectiveDate
                      ? isSameWeek(date, sourceEffectiveDate) && !isInPast
                      : !isInPast

                    return (
                      <YStack
                        key={dateISO}
                        flex={1}
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => onDayPress?.(date)}
                      >
                        <CalendarDayCell
                          date={date}
                          dateISO={dateISO}
                          isToday={isSameDay(date, today)}
                          isCurrentMonth={isMonthDate}
                          workouts={workouts}
                          compact={true}
                          gppCategoryId={gppCategoryId}
                          onWorkoutPress={onWorkoutPress}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onDragMove={onDragMove}
                          isDropTarget={isDropTarget}
                          isDragActive={isDragActive}
                          isValidDropTarget={isValidDropTarget}
                          onDropZoneLayout={onDropZoneLayout}
                          onDropZoneUnregister={onDropZoneUnregister}
                        />
                      </YStack>
                    )
                  })}
                </XStack>
              ))
            })()}
          </YStack>
        </ScrollView>
      </Animated.View>
    </YStack>
  )
}
