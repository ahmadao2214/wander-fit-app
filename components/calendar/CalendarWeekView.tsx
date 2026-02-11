import { useState, useRef, useCallback, useMemo } from 'react'
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
  parseDateISO,
} from '../../lib/calendarUtils'
import type { Phase } from '../../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LAST_WEEK_BUFFER_DAYS = 7 // Allow last week workouts to be moved up to 7 days forward

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
  /** Program start date (ISO format) - limits navigation */
  programStartDate?: string
  /** Program end date (ISO format) - limits navigation */
  programEndDate?: string
}

/**
 * Generate array of weeks within program bounds
 * Only includes weeks from program start to program end + buffer
 */
function generateProgramWeeks(
  programStartDate: Date,
  programEndDate: Date,
  bufferDays: number = LAST_WEEK_BUFFER_DAYS
): Date[] {
  const weeks: Date[] = []
  const startWeek = startOfWeek(programStartDate)
  const endWithBuffer = addDays(programEndDate, bufferDays)
  const endWeek = startOfWeek(endWithBuffer)

  let currentWeek = startWeek
  while (currentWeek <= endWeek) {
    weeks.push(new Date(currentWeek))
    currentWeek = addDays(currentWeek, 7)
  }

  return weeks
}

/**
 * Find the index of the week containing a given date
 */
function findWeekIndex(weeks: Date[], targetDate: Date): number {
  const targetWeekStart = startOfWeek(targetDate)
  return weeks.findIndex(w => isSameDay(w, targetWeekStart))
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
  programStartDate,
  programEndDate,
}: CalendarWeekViewProps) {
  // Disable FlatList scrolling while dragging to prevent gesture conflicts
  const isDragging = dragSourceSlot !== null && dragSourceSlot !== undefined
  const flatListRef = useRef<FlatList>(null)
  const today = new Date()

  // Generate weeks within program bounds (memoized)
  const weeks = useMemo(() => {
    if (programStartDate && programEndDate) {
      const startDate = parseDateISO(programStartDate)
      const endDate = parseDateISO(programEndDate)
      return generateProgramWeeks(startDate, endDate)
    }
    // Fallback: generate weeks around current week if no program bounds
    const fallbackWeeks: Date[] = []
    const center = startOfWeek(currentWeek)
    for (let i = -5; i <= 5; i++) {
      fallbackWeeks.push(addDays(center, i * 7))
    }
    return fallbackWeeks
  }, [programStartDate, programEndDate, currentWeek])

  // Find initial index - prefer today's week if within bounds, else first week
  const initialIndex = useMemo(() => {
    const todayIndex = findWeekIndex(weeks, today)
    if (todayIndex >= 0) return todayIndex
    // If today is not in program range, default to first week
    return 0
  }, [weeks, today])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const displayedWeek = weeks[currentIndex] || currentWeek
  const weekDays = getWeekDays(displayedWeek)
  const isCurrentWeekVisible = weekDays.some((d) => isSameDay(d, today))

  // Check if today is within the program bounds
  const isTodayInProgram = useMemo(() => {
    if (!programStartDate || !programEndDate) return true
    const start = parseDateISO(programStartDate)
    const endWithBuffer = addDays(parseDateISO(programEndDate), LAST_WEEK_BUFFER_DAYS)
    return today >= start && today <= endWithBuffer
  }, [programStartDate, programEndDate, today])

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
    const index = findWeekIndex(weeks, today)
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

    // Row without workouts: fixed 60px height for headers only
    // Row with workouts: flex={1} to fill remaining space
    return (
      <YStack width={SCREEN_WIDTH} flex={1} px="$1.5" gap="$2">
        {/* First row: Sun, Mon, Tue, Wed */}
        {firstRowHasWorkouts ? (
          <XStack gap="$1.5" flex={1}>
            {firstRowDays.map(renderDayColumn)}
          </XStack>
        ) : (
          <XStack gap="$1.5" height={60}>
            {firstRowDays.map(renderDayColumn)}
          </XStack>
        )}

        {/* Second row: Thu, Fri, Sat (+ empty spacer for alignment) */}
        {secondRowHasWorkouts ? (
          <XStack gap="$1.5" flex={1}>
            {secondRowDays.map(renderDayColumn)}
            <YStack flex={1} minWidth={0} />
          </XStack>
        ) : (
          <XStack gap="$1.5" height={60}>
            {secondRowDays.map(renderDayColumn)}
            <YStack flex={1} minWidth={0} />
          </XStack>
        )}
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
          {!isCurrentWeekVisible && isTodayInProgram && (
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
