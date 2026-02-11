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

  if (compact) {
    // Month view - shows workout titles with drag-drop support
    return (
      <View
        ref={viewRef}
        onLayout={handleLayout}
        style={{
          flex: 1,
          minHeight: 100,
          padding: 3,
          backgroundColor: isDropTarget ? '#dbeafe' : isToday ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          borderRadius: 4,
          borderWidth: isDropTarget ? 1 : 0,
          borderColor: isDropTarget ? '#3b82f6' : 'transparent',
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

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={{
        flex: hasWorkouts ? 1 : 0,
        flexGrow: hasWorkouts ? 1 : 0,
        minWidth: 0,
        backgroundColor: isDropTarget ? '#dbeafe' : 'transparent',
        borderRadius: 8,
        padding: 2,
        borderWidth: isDropTarget ? 2 : 0,
        borderColor: isDropTarget ? '#3b82f6' : 'transparent',
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
