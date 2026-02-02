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
        minHeight={60}
        p="$1"
        bg={isToday ? '$primary' : 'transparent'}
        rounded="$2"
        opacity={isCurrentMonth ? 1 : 0.4}
      >
        {/* Day number */}
        <Text
          fontSize={12}
          fontWeight={isToday ? '700' : '500'}
          color={isToday ? 'white' : '$color11'}
          text="center"
        >
          {dayNumber}
        </Text>

        {/* Workout indicators */}
        {workouts.length > 0 && (
          <YStack items="center" gap="$0.5" pt="$1">
            {/* Phase dots */}
            <XStack gap="$1" justify="center">
              {workouts.slice(0, 3).map((workout, idx) => (
                <YStack
                  key={`${workout.templateId}-${idx}`}
                  width={6}
                  height={6}
                  rounded="$10"
                  bg={
                    workout.phase === 'GPP'
                      ? '$blue9'
                      : workout.phase === 'SPP'
                        ? '$orange9'
                        : '$green9'
                  }
                  opacity={workout.isCompleted ? 0.5 : 1}
                />
              ))}
            </XStack>

            {/* Completion indicator */}
            {completedCount > 0 && (
              <Text
                fontSize={10}
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

  // Week view - full cards
  return (
    <YStack
      flex={1}
      minWidth={100}
      bg={isToday ? '$color2' : 'transparent'}
      rounded="$3"
      p="$2"
      gap="$2"
    >
      {/* Day header */}
      <YStack items="center" gap="$0.5">
        <Text
          fontSize={11}
          fontWeight="500"
          color="$color10"
        >
          {dayOfWeek}
        </Text>
        <YStack
          width={28}
          height={28}
          rounded="$10"
          bg={isToday ? '$primary' : 'transparent'}
          items="center"
          justify="center"
        >
          <Text
            fontSize={14}
            fontWeight={isToday ? '700' : '500'}
            color={isToday ? 'white' : '$color12'}
          >
            {dayNumber}
          </Text>
        </YStack>
      </YStack>

      {/* Workout cards */}
      <YStack gap="$2" flex={1}>
        {workouts.map((workout, idx) => (
          <CalendarWorkoutCard
            key={`${workout.templateId}-${idx}`}
            {...workout}
            compact={false}
            onPress={() => onWorkoutPress?.(workout.templateId)}
            onLongPress={() => onWorkoutLongPress?.(workout.templateId)}
          />
        ))}

        {/* Empty state */}
        {workouts.length === 0 && (
          <YStack flex={1} items="center" justify="center" opacity={0.5}>
            <Text fontSize={11} color="$color9">
              Rest
            </Text>
          </YStack>
        )}
      </YStack>
    </YStack>
  )
}
