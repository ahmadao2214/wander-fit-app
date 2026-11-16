import { useState, useRef, useCallback, useMemo } from 'react'
import { YStack, XStack, Button, ScrollView } from 'tamagui'
import { Body } from '../Typography'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, View, type ViewInstance } from 'react-native'
import { CalendarDayCell, WorkoutWithSlot } from './CalendarDayCell'
import { CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import {
  getWeekDays,
  formatWeekRange,
  addDays,
  isSameDay,
  isSameWeek,
  formatDateISO,
  startOfWeek,
  parseDateISO,
  DAY_NAMES_FULL,
} from '../../lib/calendarUtils'
import type { Phase } from '../../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
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
  /** Move a workout without dragging (VoiceOver actions) */
  onMoveWorkout?: (phase: Phase, week: number, day: number, dateISO: string) => void
}

type Rect = { x: number; y: number; width: number; height: number }

/**
 * The part of a day row you can see in the scrolling day list. A row scrolled
 * out of view would otherwise sit under the header or tab bar and take a drop
 * meant for neither. Returns null when none of the row is visible.
 */
export function clipToViewport(row: Rect, viewport: Pick<Rect, 'y' | 'height'> | null): Rect | null {
  if (!viewport) return row
  const top = Math.max(row.y, viewport.y)
  const bottom = Math.min(row.y + row.height, viewport.y + viewport.height)
  if (bottom <= top) return null
  return { ...row, y: top, height: bottom - top }
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
  onMoveWorkout,
}: CalendarWeekViewProps) {
  // Disable FlatList scrolling while dragging to prevent gesture conflicts
  const isDragging = dragSourceSlot !== null && dragSourceSlot !== undefined
  const flatListRef = useRef<FlatList>(null)

  // Where the day list shows on screen. Paging sideways doesn't move it
  // up or down, so measuring on layout is enough.
  const viewportRef = useRef<Pick<Rect, 'y' | 'height'> | null>(null)
  const listFrameRef = useRef<ViewInstance>(null)
  const handleListLayout = useCallback(() => {
    listFrameRef.current?.measureInWindow((_x, y, _w, height) => {
      viewportRef.current = { y, height }
    })
  }, [])
  const handleDayLayout = useCallback((dateISO: string, layout: Rect) => {
    const visible = clipToViewport(layout, viewportRef.current)
    if (visible) onDropZoneLayout?.(dateISO, visible)
    else onDropZoneUnregister?.(dateISO)
  }, [onDropZoneLayout, onDropZoneUnregister])
  const today = new Date()

  // Generate weeks within program bounds (memoized)
  // Only includes weeks that contain workouts (based on calendarData)
  const weeks = useMemo(() => {
    if (programStartDate && programEndDate) {
      const startDate = parseDateISO(programStartDate)
      const endDate = parseDateISO(programEndDate)
      const allWeeks = generateProgramWeeks(startDate, endDate)

      // Filter to only weeks that have at least one workout
      // This prevents showing empty weeks at the end of the program
      return allWeeks.filter(weekStart => {
        const weekDays = getWeekDays(weekStart)
        return weekDays.some(d => {
          const iso = formatDateISO(d)
          return calendarData[iso]?.workouts?.length > 0
        })
      })
    }
    // Fallback: generate weeks around current week if no program bounds
    const fallbackWeeks: Date[] = []
    const center = startOfWeek(currentWeek)
    for (let i = -5; i <= 5; i++) {
      fallbackWeeks.push(addDays(center, i * 7))
    }
    return fallbackWeeks
  }, [programStartDate, programEndDate, currentWeek, calendarData])

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

  // Navigation bounds - hide arrows at first/last week
  const isFirstWeek = currentIndex === 0
  const isLastWeek = currentIndex === weeks.length - 1

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

    // Find the source workout's effective date when dragging
    const isDragActive = isDragging
    let sourceEffectiveDate: Date | null = null

    if (isDragActive && dragSourceSlot) {
      // Find which date the source workout is currently on
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

    // Days a workout can move to: this week, from today on, and not a day
    // whose workout is done (the server won't swap with a finished one)
    const isPast = (d: Date) => d < today && !isSameDay(d, today)
    const holdsDone = (d: Date) => !!calendarData[formatDateISO(d)]?.workouts.some((w) => w.isCompleted)
    const openDays = days.filter((d) => !isPast(d) && !holdsDone(d))

    const renderDay = (date: Date) => {
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
          slotPhase: w.phase,
          slotWeek: w.week,
          slotDay: w.day,
        })) ?? []

      const isDropTarget = dragTargetDate === dateISO && dragSourceSlot !== null

      // Check if this date is a valid drop target:
      // 1. Must be same week as source
      // 2. Cannot be in the past (before today)
      const isInPast = date < today && !isSameDay(date, today)
      const isValidDropTarget = (sourceEffectiveDate
        ? isSameWeek(date, sourceEffectiveDate) && !isInPast
        : !isInPast) && !holdsDone(date)

      return (
        <CalendarDayCell
          key={dateISO}
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
          isDragActive={isDragActive}
          isValidDropTarget={isValidDropTarget}
          gppCategoryId={gppCategoryId}
          onDropZoneLayout={handleDayLayout}
          onDropZoneUnregister={onDropZoneUnregister}
          moveTargets={openDays
            .filter((d) => !isSameDay(d, date))
            .map((d) => ({ dateISO: formatDateISO(d), label: DAY_NAMES_FULL[d.getDay()] }))}
          onMoveWorkout={onMoveWorkout}
        />
      )
    }

    // One day per row, Sunday to Saturday, so the week reads as one list
    // (design audit F01). At large text sizes the list scrolls; it holds
    // still while a workout is dragged so the drop zones stay put.
    return (
      <ScrollView
        width={SCREEN_WIDTH}
        flex={1}
        scrollEnabled={!isDragActive}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ px: "$3", pb: "$4" }}
      >
        <YStack gap="$1">{days.map(renderDay)}</YStack>
      </ScrollView>
    )
  }, [calendarData, onWorkoutPress, onWorkoutLongPress, onDragStart, onDragEnd, onDragMove, dragTargetDate, dragSourceSlot, isDragging, gppCategoryId, handleDayLayout, onDropZoneUnregister, onMoveWorkout])

  const keyExtractor = useCallback((item: Date) => formatDateISO(item), [])

  return (
    <YStack flex={1} gap="$2">
      {/* Navigation header */}
      <XStack items="center" justify="space-between" px="$2">
        {/* Previous arrow - hidden at first week */}
        {isFirstWeek ? (
          <YStack width={32} height={32} />
        ) : (
          <Button
            size="$2"
            circular
            chromeless
            icon={ChevronLeft}
            // A 28pt circle, 44pt to the finger
            hitSlop={8}
            accessibilityLabel="Previous week"
            onPress={handlePreviousWeek}
          />
        )}

        <XStack flex={1} minW={0} items="center" justify="center" gap="$2" flexWrap="wrap">
          <Body fontWeight="600" text="center" shrink={1}>{formatWeekRange(displayedWeek)}</Body>
          {!isCurrentWeekVisible && isTodayInProgram && (
            <Button
              size="$2"
              chromeless
              onPress={handleGoToToday}
              color="$primaryText"
            >
              Today
            </Button>
          )}
        </XStack>

        {/* Next arrow - hidden at last week */}
        {isLastWeek ? (
          <YStack width={32} height={32} />
        ) : (
          <Button
            size="$2"
            circular
            chromeless
            icon={ChevronRight}
            // A 28pt circle, 44pt to the finger
            hitSlop={8}
            accessibilityLabel="Next week"
            onPress={handleNextWeek}
          />
        )}
      </XStack>


      {/* Swipeable week view - scrolling disabled during drag to prevent gesture conflicts */}
      <View ref={listFrameRef} onLayout={handleListLayout} testID="week-pages" style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={weeks}
          renderItem={renderWeek}
          keyExtractor={keyExtractor}
          extraData={{ dragSourceSlot, dragTargetDate, calendarData }}
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
      </View>
    </YStack>
  )
}
