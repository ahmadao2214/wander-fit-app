import { useCallback, useRef, useEffect } from 'react'
import { YStack, XStack, Text } from 'tamagui'
import { View, LayoutChangeEvent } from 'react-native'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from './CalendarWorkoutCard'
import type { Phase } from '../../types'

export interface WorkoutWithSlot extends Omit<CalendarWorkoutCardProps, 'onPress' | 'onLongPress' | 'compact'> {
  /** Slot info for drag-drop */
  slotPhase?: Phase
  slotWeek?: number
  slotDay?: number
}

export interface CalendarDayCellProps {
  date: Date
  isToday: boolean
  isCurrentMonth?: boolean
  workouts: WorkoutWithSlot[]
  compact?: boolean
  onWorkoutPress?: (templateId: string) => void
  onWorkoutLongPress?: (templateId: string) => void
  /** Drag callbacks for swapping */
  onDragStart?: (phase: Phase, week: number, day: number) => void
  onDragEnd?: () => void
  /** Whether this cell is a potential drop target */
  isDropTarget?: boolean
  /** Register this cell as a drop zone */
  onLayout?: (phase: Phase, week: number, day: number, layout: { x: number; y: number; width: number; height: number }) => void
}

/**
 * CalendarDayCell - A cell representing a day in the calendar
 *
 * Week view: Shows full workout cards stacked vertically
 * Month view: Shows compact indicators with count badge
 */
export function CalendarDayCell({
  date,
  isToday,
  isCurrentMonth = true,
  workouts,
  compact = false,
  onWorkoutPress,
  onWorkoutLongPress,
  onDragStart,
  onDragEnd,
  isDropTarget = false,
  onLayout,
}: CalendarDayCellProps) {
  const dayNumber = date.getDate()
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
  const viewRef = useRef<View>(null)

  // Handle layout for drop zone registration
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (workouts.length > 0 && workouts[0].slotPhase && workouts[0].slotWeek && workouts[0].slotDay) {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        onLayout?.(
          workouts[0].slotPhase!,
          workouts[0].slotWeek!,
          workouts[0].slotDay!,
          { x, y, width, height }
        )
      })
    }
  }, [workouts, onLayout])

  // Handle long press on workout card to initiate drag
  const handleWorkoutLongPress = useCallback((workout: WorkoutWithSlot) => {
    if (workout.slotPhase && workout.slotWeek && workout.slotDay && !workout.isLocked && !workout.isCompleted) {
      onDragStart?.(workout.slotPhase, workout.slotWeek, workout.slotDay)
    }
    onWorkoutLongPress?.(workout.templateId)
  }, [onDragStart, onWorkoutLongPress])

  if (compact) {
    // Month view - compact display
    const completedCount = workouts.filter((w) => w.isCompleted).length
    const totalCount = workouts.length

    return (
      <YStack
        flex={1}
        minHeight={44}
        p="$0.5"
        bg={isToday ? '$primary' : 'transparent'}
        rounded="$2"
        opacity={isCurrentMonth ? 1 : 0.4}
      >
        {/* Day number */}
        <Text
          fontSize={12}
          fontWeight={isToday ? '700' : '500'}
          color={isToday ? 'white' : '$color11'}
          textAlign="center"
        >
          {dayNumber}
        </Text>

        {/* Workout indicators */}
        {workouts.length > 0 && (
          <YStack alignItems="center" gap="$0.5" pt="$0.5">
            {/* Phase dots */}
            <XStack gap="$1" justifyContent="center">
              {workouts.slice(0, 3).map((workout, idx) => (
                <YStack
                  key={`${workout.templateId}-${idx}`}
                  width={5}
                  height={5}
                  borderRadius={10}
                  backgroundColor={
                    workout.isLocked
                      ? '$gray6'
                      : workout.phase === 'GPP'
                        ? '$blue9'
                        : workout.phase === 'SPP'
                          ? '$orange9'
                          : '$green9'
                  }
                  opacity={workout.isLocked || workout.isCompleted ? 0.5 : 1}
                />
              ))}
            </XStack>

            {/* Completion indicator */}
            {completedCount > 0 && (
              <Text
                fontSize={9}
                fontWeight="600"
                color={isToday ? 'white' : '$green9'}
              >
                {completedCount === totalCount ? '✓' : `${completedCount}/${totalCount}`}
              </Text>
            )}
          </YStack>
        )}
      </YStack>
    )
  }

  // Week view - compact cards for 5+ days visible
  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={{
        flex: 1,
        minWidth: 64,
        backgroundColor: isDropTarget ? '#dbeafe' : isToday ? 'rgba(0,0,0,0.03)' : 'transparent',
        borderRadius: 8,
        padding: 4,
        borderWidth: isDropTarget ? 2 : 0,
        borderColor: isDropTarget ? '#3b82f6' : 'transparent',
        borderStyle: 'dashed',
      }}
    >
      {/* Day header - compact */}
      <YStack alignItems="center" gap="$0.5">
        <Text
          fontSize={10}
          fontWeight="500"
          color="$color10"
        >
          {dayOfWeek}
        </Text>
        <YStack
          width={24}
          height={24}
          borderRadius={12}
          backgroundColor={isToday ? '$primary' : 'transparent'}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize={12}
            fontWeight={isToday ? '700' : '500'}
            color={isToday ? 'white' : '$color12'}
          >
            {dayNumber}
          </Text>
        </YStack>
      </YStack>

      {/* Workout cards - only show if there are workouts */}
      {workouts.length > 0 && (
        <YStack gap="$1" mt="$1">
          {workouts.map((workout, idx) => (
            <CalendarWorkoutCard
              key={`${workout.templateId}-${idx}`}
              {...workout}
              compact={false}
              onPress={() => onWorkoutPress?.(workout.templateId)}
              onLongPress={() => handleWorkoutLongPress(workout)}
            />
          ))}
        </YStack>
      )}
    </View>
  )
}
