import { YStack, XStack, Text } from 'tamagui'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from './CalendarWorkoutCard'

export interface CalendarDayCellProps {
  date: Date
  isToday: boolean
  isCurrentMonth?: boolean
  workouts: Omit<CalendarWorkoutCardProps, 'onPress' | 'onLongPress' | 'compact'>[]
  compact?: boolean
  onWorkoutPress?: (templateId: string) => void
  onWorkoutLongPress?: (templateId: string) => void
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
}: CalendarDayCellProps) {
  const dayNumber = date.getDate()
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })

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
    <YStack
      flex={1}
      minWidth={64}
      backgroundColor={isToday ? '$color2' : 'transparent'}
      borderRadius="$2"
      p="$1"
      gap="$1"
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
        <YStack gap="$1">
          {workouts.map((workout, idx) => (
            <CalendarWorkoutCard
              key={`${workout.templateId}-${idx}`}
              {...workout}
              compact={false}
              onPress={() => onWorkoutPress?.(workout.templateId)}
              onLongPress={() => onWorkoutLongPress?.(workout.templateId)}
            />
          ))}
        </YStack>
      )}
    </YStack>
  )
}
