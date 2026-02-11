import { useState, useRef, useCallback } from 'react'
import { YStack, XStack, Text, Button } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { CalendarDayCell, WorkoutWithSlot } from './CalendarDayCell'
import { CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import {
  getWeekDays,
  formatWeekRange,
  addDays,
  isSameDay,
  formatDateISO,
  startOfWeek,
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
  isLocked?: boolean
}

export interface CalendarWeekViewProps {
  calendarData: Record<
    string,
    {
      date: string
      workouts: CalendarWorkout[]
    }
  >
  currentWeek: Date
  onWeekChange: (newWeek: Date) => void
  onWorkoutPress?: (templateId: string) => void
  onWorkoutLongPress?: (templateId: string) => void
  /** Called when drag starts on a workout */
  onDragStart?: (phase: Phase, week: number, day: number) => void
  /** Called when drag ends */
  onDragEnd?: () => void
  /** Called during drag with absolute position */
  onDragMove?: (x: number, y: number) => void
  /** Current drag target slot for highlighting */
  dragTargetSlot?: { phase: Phase; week: number; day: number } | null
  /** Category ID for color coding (1-4) */
  gppCategoryId?: number
  /** Callback to register drop zones */
  onDropZoneLayout?: (phase: Phase, week: number, day: number, layout: { x: number; y: number; width: number; height: number }) => void
}

// Generate array of weeks around current date for infinite scroll feel
function generateWeeks(centerDate: Date, count: number = 5): Date[] {
  const weeks: Date[] = []
  const center = startOfWeek(centerDate)
  const halfCount = Math.floor(count / 2)

  for (let i = -halfCount; i <= halfCount; i++) {
    weeks.push(addDays(center, i * 7))
  }

  return weeks
}

/**
 * CalendarWeekView - Week-based calendar view with swipe navigation
 *
 * Shows 7 days with workout cards.
 * Supports horizontal swipe to change weeks.
 * Header updates automatically on swipe.
 */
export function CalendarWeekView({
  calendarData,
  currentWeek,
  onWeekChange,
  onWorkoutPress,
  onWorkoutLongPress,
  onDragStart,
  onDragEnd,
  onDragMove,
  dragTargetSlot,
  gppCategoryId,
  onDropZoneLayout,
}: CalendarWeekViewProps) {
  const flatListRef = useRef<FlatList>(null)
  const [weeks] = useState(() => generateWeeks(currentWeek, 11))
  const [currentIndex, setCurrentIndex] = useState(5) // Middle of 11 weeks

  const today = new Date()
  const displayedWeek = weeks[currentIndex] || currentWeek
  const weekDays = getWeekDays(displayedWeek)
  const isCurrentWeekVisible = weekDays.some((d) => isSameDay(d, today))

  const handlePreviousWeek = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true })
    }
  }, [currentIndex])

  const handleNextWeek = useCallback(() => {
    if (currentIndex < weeks.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    }
  }, [currentIndex, weeks.length])

  const handleGoToToday = useCallback(() => {
    // Find the week containing today
    const todayWeekStart = startOfWeek(today)
    const index = weeks.findIndex((w) => isSameDay(w, todayWeekStart))
    if (index >= 0) {
      flatListRef.current?.scrollToIndex({ index, animated: true })
    } else {
      // Today's week is outside our range, update the parent
      onWeekChange(today)
    }
  }, [weeks, onWeekChange])

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const newIndex = Math.round(offsetX / SCREEN_WIDTH)
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < weeks.length) {
      setCurrentIndex(newIndex)
      onWeekChange(weeks[newIndex])
    }
  }, [currentIndex, weeks, onWeekChange])

  const renderWeek = useCallback(({ item: weekStart }: { item: Date }) => {
    const days = getWeekDays(weekStart)

    return (
      <XStack width={SCREEN_WIDTH} px="$2">
        {days.map((date) => {
          const dateISO = formatDateISO(date)
          const dayData = calendarData[dateISO]
          const workouts: WorkoutWithSlot[] =
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
              isLocked: w.isLocked,
              gppCategoryId, // Pass category for color coding
              // Pass slot info for drag-drop
              slotPhase: w.phase,
              slotWeek: w.week,
              slotDay: w.day,
            })) ?? []

          // Check if this cell is the current drop target
          const isDropTarget = dragTargetSlot && workouts.some(
            (w) =>
              w.slotPhase === dragTargetSlot.phase &&
              w.slotWeek === dragTargetSlot.week &&
              w.slotDay === dragTargetSlot.day
          )

          return (
            <CalendarDayCell
              key={dateISO}
              date={date}
              isToday={isSameDay(date, today)}
              workouts={workouts}
              compact={false}
              onWorkoutPress={onWorkoutPress}
              onWorkoutLongPress={onWorkoutLongPress}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragMove={onDragMove}
              isDropTarget={isDropTarget ?? false}
              gppCategoryId={gppCategoryId}
              onLayout={onDropZoneLayout}
            />
          )
        })}
      </XStack>
    )
  }, [calendarData, onWorkoutPress, onWorkoutLongPress, onDragStart, onDragEnd, onDragMove, dragTargetSlot, gppCategoryId, onDropZoneLayout])

  const keyExtractor = useCallback((item: Date) => formatDateISO(item), [])

  return (
    <YStack flex={1} gap="$2">
      {/* Navigation header */}
      <XStack alignItems="center" justifyContent="space-between" px="$2">
        <Button
          size="$2"
          circular
          chromeless
          icon={ChevronLeft}
          onPress={handlePreviousWeek}
        />

        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontWeight="600" color="$color12">
            {formatWeekRange(displayedWeek)}
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
          size="$2"
          circular
          chromeless
          icon={ChevronRight}
          onPress={handleNextWeek}
        />
      </XStack>


      {/* Swipeable week view */}
      <FlatList
        ref={flatListRef}
        data={weeks}
        renderItem={renderWeek}
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
