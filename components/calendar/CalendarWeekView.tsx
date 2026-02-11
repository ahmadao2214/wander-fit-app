import { useState, useRef, useCallback } from 'react'
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native'
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
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  exercisePreview?: string[] // First 3 exercise names for preview
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
  /** Current drag target date for highlighting (ISO format) */
  dragTargetDate?: string | null
  /** Current drag source slot */
  dragSourceSlot?: { phase: Phase; week: number; day: number } | null
  /** Category ID for color coding (1-4) */
  gppCategoryId?: number
  /** Callback to register drop zones (date-based) */
  onDropZoneLayout?: (dateISO: string, layout: { x: number; y: number; width: number; height: number }) => void
  /** Callback to unregister drop zones on unmount */
  onDropZoneUnregister?: (dateISO: string) => void
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
  dragTargetDate,
  dragSourceSlot,
  gppCategoryId,
  onDropZoneLayout,
  onDropZoneUnregister,
}: CalendarWeekViewProps) {
  // Disable FlatList scrolling while dragging to prevent gesture conflicts
  const isDragging = dragSourceSlot !== null && dragSourceSlot !== undefined
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
      setCurrentIndex(index)
      flatListRef.current?.scrollToIndex({ index, animated: true })
      onWeekChange(weeks[index])
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
    // Split into two rows: Sun-Wed (0-3) and Thu-Sat (4-6)
    const firstRowDays = days.slice(0, 4)
    const secondRowDays = days.slice(4, 7)

    const renderDayColumn = (date: Date) => {
      const dateISO = formatDateISO(date)
      const isDateToday = isSameDay(date, today)
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
          gppCategoryId,
          exercisePreview: w.exercisePreview,
          slotPhase: w.phase,
          slotWeek: w.week,
          slotDay: w.day,
        })) ?? []

      const isDropTarget = dragTargetDate === dateISO && dragSourceSlot !== null

      return (
        <YStack key={dateISO} flex={1} gap="$1" minWidth={0}>
          {/* Day header */}
          <YStack alignItems="center" gap="$0.5">
            <Text
              fontSize={11}
              fontWeight="500"
              color={isDateToday ? '$primary' : '$color9'}
            >
              {DAY_NAMES[date.getDay()]}
            </Text>
            <YStack
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor={isDateToday ? '$primary' : 'transparent'}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize={14}
                fontWeight={isDateToday ? '700' : '500'}
                color={isDateToday ? 'white' : '$color12'}
              >
                {date.getDate()}
              </Text>
            </YStack>
          </YStack>

          {/* Workout cell */}
          <CalendarDayCell
            date={date}
            dateISO={dateISO}
            isToday={isDateToday}
            workouts={workouts}
            compact={false}
            onWorkoutPress={onWorkoutPress}
            onWorkoutLongPress={onWorkoutLongPress}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            isDropTarget={isDropTarget}
            gppCategoryId={gppCategoryId}
            onDropZoneLayout={onDropZoneLayout}
            onDropZoneUnregister={onDropZoneUnregister}
          />
        </YStack>
      )
    }

    // Check if rows have workouts to determine layout
    const firstRowHasWorkouts = firstRowDays.some(d => {
      const iso = formatDateISO(d)
      return calendarData[iso]?.workouts?.length > 0
    })
    const secondRowHasWorkouts = secondRowDays.some(d => {
      const iso = formatDateISO(d)
      return calendarData[iso]?.workouts?.length > 0
    })

    return (
      <YStack width={SCREEN_WIDTH} flex={1} px="$1.5" gap="$2">
        {/* First row: Sun, Mon, Tue, Wed */}
        <XStack
          gap="$1.5"
          flexGrow={firstRowHasWorkouts ? 1 : 0}
          flexShrink={firstRowHasWorkouts ? 1 : 0}
          flexBasis={firstRowHasWorkouts ? 0 : 'auto'}
          minHeight={60}
        >
          {firstRowDays.map(renderDayColumn)}
        </XStack>

        {/* Second row: Thu, Fri, Sat (+ empty spacer for alignment) */}
        <XStack
          gap="$1.5"
          flexGrow={secondRowHasWorkouts ? 1 : 0}
          flexShrink={secondRowHasWorkouts ? 1 : 0}
          flexBasis={secondRowHasWorkouts ? 0 : 'auto'}
          minHeight={60}
        >
          {secondRowDays.map(renderDayColumn)}
          {/* Empty spacer to match 4-column layout */}
          <YStack flex={1} minWidth={0} />
        </XStack>
      </YStack>
    )
  }, [calendarData, onWorkoutPress, onWorkoutLongPress, onDragStart, onDragEnd, onDragMove, dragTargetDate, dragSourceSlot, gppCategoryId, onDropZoneLayout, onDropZoneUnregister])

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


      {/* Swipeable week view - scrolling disabled during drag to prevent gesture conflicts */}
      <FlatList
        ref={flatListRef}
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        scrollEnabled={!isDragging}
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
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'stretch' }}
      />
    </YStack>
  )
}
