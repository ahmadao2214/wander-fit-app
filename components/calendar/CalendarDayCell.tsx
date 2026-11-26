import { useCallback, useRef, useEffect, useMemo } from 'react'
import { YStack, XStack, Stack, Text, useTheme } from 'tamagui'
import { Body, Caption, Supporting, numeric } from '../Typography'
import { View, LayoutChangeEvent, useWindowDimensions, type ViewInstance } from 'react-native'
import { CalendarWorkoutCard, CalendarWorkoutCardProps, STACK_FONT_SCALE, type MoveTarget } from './CalendarWorkoutCard'
import { DraggableWorkoutCard } from './DraggableWorkoutCard'
import type { Phase } from '../../types'
import { DAY_NAMES, DAY_NAMES_FULL } from '../../lib/calendarUtils'

// At accessibility text sizes the date goes above the cards, not beside them
export { STACK_FONT_SCALE }

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


export interface WorkoutWithSlot extends Omit<CalendarWorkoutCardProps, 'onPress' | 'onLongPress' | 'compact'> {
  /** Slot info for drag-drop */
  slotPhase?: Phase
  slotWeek?: number
  slotDay?: number
}

export interface CalendarDayCellProps {
  date: Date
  /** Date in ISO format for drop zone registration */
  dateISO?: string
  isToday: boolean
  isCurrentMonth?: boolean
  workouts: WorkoutWithSlot[]
  compact?: boolean
  onWorkoutPress?: (templateId: string) => void
  onWorkoutLongPress?: (templateId: string) => void
  /** Drag callbacks for swapping */
  onDragStart?: (phase: Phase, week: number, day: number) => void
  onDragEnd?: () => void
  /** Called during drag with absolute position */
  onDragMove?: (x: number, y: number) => void
  /** Whether this cell is a potential drop target */
  isDropTarget?: boolean
  /** Whether a drag is currently active (for showing valid/invalid states) */
  isDragActive?: boolean
  /** Whether this cell is a valid drop target (same week as source) */
  isValidDropTarget?: boolean
  /** Register this cell as a drop zone (date-based) */
  onDropZoneLayout?: (dateISO: string, layout: { x: number; y: number; width: number; height: number }) => void
  /** Unregister this cell as a drop zone (cleanup on unmount) */
  onDropZoneUnregister?: (dateISO: string) => void
  /** Category ID for color coding (1-4) */
  gppCategoryId?: number
  /** Week view: days a workout here can move to, for VoiceOver */
  moveTargets?: MoveTarget[]
  /** Week view: move a workout without dragging */
  onMoveWorkout?: (phase: Phase, week: number, day: number, dateISO: string) => void
}

/**
 * CalendarDayCell - A cell representing a day in the calendar
 *
 * Week view: Shows full workout cards stacked vertically
 * Month view: Shows compact indicators with count badge
 */
// Helper to format date as ISO
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function CalendarDayCell({
  date,
  dateISO: dateISOProp,
  isToday,
  isCurrentMonth = true,
  workouts,
  compact = false,
  onWorkoutPress,
  onWorkoutLongPress,
  onDragStart,
  onDragEnd,
  onDragMove,
  isDropTarget = false,
  isDragActive = false,
  isValidDropTarget = true,
  onDropZoneLayout,
  onDropZoneUnregister,
  gppCategoryId,
  moveTargets,
  onMoveWorkout,
}: CalendarDayCellProps) {
  const dayNumber = date.getDate()
  const { fontScale } = useWindowDimensions()
  const dateISO = dateISOProp ?? formatDateISO(date)
  const viewRef = useRef<ViewInstance>(null)

  // Register where this day sits on screen, so a drag can find it
  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      onDropZoneLayout?.(dateISO, { x, y, width, height })
    })
  }, [dateISO, onDropZoneLayout])
  const handleLayout = useCallback((_event: LayoutChangeEvent) => measure(), [measure])

  // Measure again when a drag starts. onLayout doesn't fire when the day
  // list scrolls or the week pages sideways, so the first numbers go stale.
  useEffect(() => {
    if (isDragActive) measure()
  }, [isDragActive, measure])

  // Cleanup: unregister drop zone when component unmounts
  useEffect(() => {
    return () => {
      onDropZoneUnregister?.(dateISO)
    }
  }, [dateISO, onDropZoneUnregister])

  // Handle long press on workout card to initiate drag
  const handleWorkoutLongPress = useCallback((workout: WorkoutWithSlot) => {
    if (workout.slotPhase && workout.slotWeek && workout.slotDay && !workout.isLocked && !workout.isCompleted) {
      onDragStart?.(workout.slotPhase, workout.slotWeek, workout.slotDay)
    }
    onWorkoutLongPress?.(workout.templateId)
  }, [onDragStart, onWorkoutLongPress])

  // The Program board's theme: the hovered day takes the words colour, not blue
  const theme = useTheme()

  // Determine background color for compact (month) view
  // Priority: hovering > Green (valid target) > Red (invalid). Today is the day circle.
  const getCompactBackground = () => {
    if (isDropTarget && isValidDropTarget) {
      return theme.color3?.val // Hovering and about to drop
    }
    if (isDragActive && !isValidDropTarget) {
      return '#fee2e2' // Light red - invalid
    }
    if (isDragActive && isValidDropTarget) {
      return '#f0fdf4' // Light green - valid drop target
    }
    return 'transparent'
  }

  const getCompactBorderColor = () => {
    if (isDropTarget && isValidDropTarget) {
      return theme.color?.val // Words colour - hovering and about to drop
    }
    if (isDragActive && !isValidDropTarget) {
      return '#ef4444' // Red - invalid
    }
    if (isDragActive && isValidDropTarget) {
      return '#22c55e' // Green - valid drop target
    }
    return 'transparent'
  }

  if (compact) {
    // Month view - shows workout titles with drag-drop support
    // Show border for all targets during drag (valid = green, invalid = red, hovering = words)
    const showCompactBorder = isDragActive || isDropTarget
    return (
      <View
        ref={viewRef}
        onLayout={handleLayout}
        style={{
          flex: 1,
          minHeight: 100,
          padding: 3,
          backgroundColor: getCompactBackground(),
          borderRadius: 4,
          borderWidth: showCompactBorder ? 1 : 0,
          borderColor: getCompactBorderColor(),
          borderStyle: 'dashed',
          opacity: isCurrentMonth ? 1 : 0.4,
        }}
      >
        {/* Day number */}
        <YStack
          items="center"
          pb="$0.5"
        >
          <YStack
            width={22}
            height={22}
            rounded={11}
            bg={isToday ? '$primary' : 'transparent'}
            items="center"
            justify="center"
          >
            <Text
              fontSize={12}
              lineHeight={16}
              fontWeight={isToday ? '700' : '500'}
              color={isToday ? '$background' : '$color11'}
            >
              {dayNumber}
            </Text>
          </YStack>
        </YStack>

        {/* Workout cards - compact with titles */}
        {workouts.length > 0 && (
          <YStack gap={2}>
            {workouts.slice(0, 3).map((workout, idx) => {
              const slotKey = workout.slotPhase && workout.slotWeek && workout.slotDay
                ? `${workout.slotPhase}-${workout.slotWeek}-${workout.slotDay}`
                : workout.templateId

              return (
                <DraggableWorkoutCard
                  key={`${workout.templateId}-${idx}`}
                  {...workout}
                  slotKey={slotKey}
                  compact={true}
                  onPress={() => onWorkoutPress?.(workout.templateId)}
                  onLongPress={() => handleWorkoutLongPress(workout)}
                  onDragStart={() => {
                    if (workout.slotPhase && workout.slotWeek && workout.slotDay) {
                      onDragStart?.(workout.slotPhase, workout.slotWeek, workout.slotDay)
                    }
                  }}
                  onDragMove={(_, x, y) => onDragMove?.(x, y)}
                  onDragEnd={() => onDragEnd?.()}
                  dragDisabled={workout.isLocked || workout.isCompleted}
                  isDropTarget={isDropTarget}
                />
              )
            })}
            {/* Show +N more if there are more workouts */}
            {workouts.length > 3 && (
              <Caption
                color="$color10"
                text="center"
                accessibilityLabel={`${workouts.length - 3} more ${workouts.length - 3 === 1 ? 'workout' : 'workouts'}`}
              >
                +{workouts.length - 3}
              </Caption>
            )}
          </YStack>
        )}
      </View>
    )
  }

  // Week view: one row of the day list. Date on the left, the day's cards
  // (or "Rest") filling the width. The whole row is the drop zone.
  const hasWorkouts = workouts.length > 0
  const isHovered = isDropTarget && isValidDropTarget
  const dateLabel = `${DAY_NAMES_FULL[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${dayNumber}`
  const dayA11yLabel = [dateLabel, isToday ? 'today' : null, hasWorkouts ? null : 'rest day'].filter(Boolean).join(', ')
  const stacked = fontScale >= STACK_FONT_SCALE

  return (
    <View ref={viewRef} onLayout={handleLayout} testID={`week-day-${dateISO}`}>
      <Stack
        testID={`week-day-row-${dateISO}`}
        flexDirection={stacked ? 'column' : 'row'}
        gap={stacked ? '$1' : '$3'}
        px="$2"
        py="$2"
        minH={56}
        items={hasWorkouts || stacked ? 'stretch' : 'center'}
        rounded="$4"
        borderWidth={2}
        borderStyle={isHovered ? 'solid' : 'dashed'}
        // Only during a drag: dashed outline on days that can take the
        // workout, a solid one on the day under your finger, and dimmed days
        // that can't (another week, or already past)
        borderColor={isHovered ? '$primary' : isDragActive && isValidDropTarget ? '$borderColorHover' : 'transparent'}
        bg={isHovered ? '$color3' : 'transparent'}
        opacity={isDragActive && !isValidDropTarget ? 0.4 : 1}
      >
        {stacked ? (
          // Large text: one line, "Sun 15", so the cards keep the full width
          <XStack gap="$2" items="center" accessible accessibilityLabel={dayA11yLabel}>
            <Body fontWeight="600" color={isToday ? '$primaryText' : '$color12'} style={numeric}>
              {DAY_NAMES[date.getDay()]} {dayNumber}
            </Body>
            {isToday && <Supporting color="$primaryText">Today</Supporting>}
          </XStack>
        ) : (
          <YStack width={40} items="center" accessible accessibilityLabel={dayA11yLabel}>
            <Caption color={isToday ? '$primaryText' : '$color10'} fontWeight={isToday ? '600' : '400'}>
              {DAY_NAMES[date.getDay()]}
            </Caption>
            <YStack
              width={32}
              height={32}
              rounded={16}
              bg={isToday ? '$primary' : 'transparent'}
              items="center"
              justify="center"
            >
              <Body fontWeight="600" color={isToday ? '$background' : '$color12'} style={numeric}>
                {dayNumber}
              </Body>
            </YStack>
          </YStack>
        )}

        {hasWorkouts ? (
          <YStack flex={1} minW={0} gap="$2">
            {workouts.map((workout, idx) => {
              const slotKey = workout.slotPhase && workout.slotWeek && workout.slotDay
                ? `${workout.slotPhase}-${workout.slotWeek}-${workout.slotDay}`
                : workout.templateId

              return (
                <DraggableWorkoutCard
                  key={`${workout.templateId}-${idx}`}
                  {...workout}
                  slotKey={slotKey}
                  compact={false}
                  onPress={() => onWorkoutPress?.(workout.templateId)}
                  onLongPress={() => handleWorkoutLongPress(workout)}
                  onDragStart={() => {
                    if (workout.slotPhase && workout.slotWeek && workout.slotDay) {
                      onDragStart?.(workout.slotPhase, workout.slotWeek, workout.slotDay)
                    }
                  }}
                  onDragMove={(_, x, y) => onDragMove?.(x, y)}
                  onDragEnd={() => onDragEnd?.()}
                  dragDisabled={workout.isLocked || workout.isCompleted}
                  moveTargets={moveTargets}
                  onMove={(target) => {
                    if (workout.slotPhase && workout.slotWeek && workout.slotDay) {
                      onMoveWorkout?.(workout.slotPhase, workout.slotWeek, workout.slotDay, target)
                    }
                  }}
                />
              )
            })}
          </YStack>
        ) : (
          <Supporting flex={stacked ? undefined : 1} color="$color10" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            Rest
          </Supporting>
        )}
      </Stack>
    </View>
  )
}
