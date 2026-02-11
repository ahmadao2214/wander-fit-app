import { useCallback, useRef, useEffect, useMemo } from 'react'
import { YStack, XStack, Text } from 'tamagui'
import { View, LayoutChangeEvent } from 'react-native'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import { DraggableWorkoutCard } from './DraggableWorkoutCard'
import type { Phase } from '../../types'

/**
 * Phase colors for visual distinction
 * GPP = Blue (foundation phase)
 * SPP = Orange (sport-specific phase)
 * SSP = Green (competition prep phase)
 */
const PHASE_DOT_COLORS: Record<Phase, string> = {
  GPP: '$blue9',
  SPP: '$orange9',
  SSP: '$green9',
}

const DEFAULT_DOT_COLOR = '$gray9'

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
}: CalendarDayCellProps) {
  const dayNumber = date.getDate()
  const dateISO = dateISOProp ?? formatDateISO(date)
  const viewRef = useRef<View>(null)

  // Handle layout for drop zone registration (all days are drop zones now)
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      onDropZoneLayout?.(dateISO, { x, y, width, height })
    })
  }, [dateISO, onDropZoneLayout])

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

  // Determine background color for compact (month) view
  // Priority: Blue (hovering) > Green (valid target) > Red (invalid) > Today
  const getCompactBackground = () => {
    if (isDropTarget && isValidDropTarget) {
      return '#dbeafe' // Blue - hovering and about to drop
    }
    if (isDragActive && !isValidDropTarget) {
      return '#fee2e2' // Light red - invalid
    }
    if (isDragActive && isValidDropTarget) {
      return '#f0fdf4' // Light green - valid drop target
    }
    if (isToday) {
      return 'rgba(59, 130, 246, 0.1)' // Light blue for today
    }
    return 'transparent'
  }

  const getCompactBorderColor = () => {
    if (isDropTarget && isValidDropTarget) {
      return '#3b82f6' // Blue - hovering and about to drop
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
    // Show border for all targets during drag (valid = green, invalid = red, hovering = blue)
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
          alignItems="center"
          pb="$0.5"
        >
          <YStack
            width={20}
            height={20}
            borderRadius={10}
            backgroundColor={isToday ? '$primary' : 'transparent'}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize={11}
              fontWeight={isToday ? '700' : '500'}
              color={isToday ? 'white' : '$color11'}
            >
              {dayNumber}
            </Text>
          </YStack>
        </YStack>

        {/* Workout cards - compact with titles */}
        {workouts.length > 0 && (
          <YStack gap={2}>
            {workouts.slice(0, 3).map((workout, idx) => {
              const phaseColor = PHASE_DOT_COLORS[workout.phase] ?? DEFAULT_DOT_COLOR
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
              <Text fontSize={8} color="$color9" textAlign="center">
                +{workouts.length - 3} more
              </Text>
            )}
          </YStack>
        )}
      </View>
    )
  }

  // Week view - workout cards
  const hasWorkouts = workouts.length > 0

  // Determine background color based on drag state
  // Priority: Blue (hovering) > Green (valid target) > Red (invalid)
  const getWeekViewBackground = () => {
    if (isDropTarget && isValidDropTarget) {
      return '#dbeafe' // Blue highlight - hovering and about to drop
    }
    if (isDragActive && !isValidDropTarget) {
      return '#fee2e2' // Red tint - invalid drop target
    }
    if (isDragActive && isValidDropTarget) {
      return '#f0fdf4' // Light green tint - valid drop target (any cell)
    }
    return 'transparent'
  }

  const getBorderColor = () => {
    if (isDropTarget && isValidDropTarget) {
      return '#3b82f6' // Blue - hovering and about to drop
    }
    if (isDragActive && !isValidDropTarget) {
      return '#ef4444' // Red - invalid
    }
    if (isDragActive && isValidDropTarget) {
      return '#22c55e' // Green - valid drop target (any cell)
    }
    return 'transparent'
  }

  // During drag, empty cells should expand to match cells with workouts
  const shouldExpand = hasWorkouts || isDragActive

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={{
        flex: shouldExpand ? 1 : 0,
        flexGrow: shouldExpand ? 1 : 0,
        minWidth: 0,
        backgroundColor: getWeekViewBackground(),
        borderRadius: 8,
        padding: 2,
        borderWidth: isDragActive || isDropTarget ? 2 : 0,
        borderColor: getBorderColor(),
        borderStyle: 'dashed',
        overflow: 'hidden',
      }}
    >
      {/* Workout cards */}
      {hasWorkouts ? (
        <YStack gap="$1">
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
                isDropTarget={isDropTarget}
              />
            )
          })}
        </YStack>
      ) : null}
    </View>
  )
}
