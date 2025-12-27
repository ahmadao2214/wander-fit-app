import { YStack, XStack, Text, Card, Button } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useRouter } from 'expo-router'
import { ChevronRight, Dumbbell } from '@tamagui/lucide-icons'

interface WeekSchedulePreviewProps {
  phase?: string
  week?: number
  currentDay?: number
}

/**
 * WeekSchedulePreview - Compact horizontal view of the current week's workouts
 * 
 * Shows on the Today screen to give context about the week's schedule.
 * Tapping on a workout navigates to its detail page.
 * Tapping "View Full Schedule" goes to the Browse screen.
 */
export function WeekSchedulePreview({
  phase,
  week,
  currentDay,
}: WeekSchedulePreviewProps) {
  const router = useRouter()

  // Get current program state if not provided
  const programState = useQuery(api.userPrograms.getCurrentProgramState, {})

  const effectivePhase = phase ?? programState?.phase
  const effectiveWeek = week ?? programState?.week
  const effectiveDay = currentDay ?? programState?.day

  // Get week schedule with overrides applied
  const weekSchedule = useQuery(
    api.scheduleOverrides.getWeekSchedule,
    effectivePhase && effectiveWeek
      ? {
          phase: effectivePhase as 'GPP' | 'SPP' | 'SSP',
          week: effectiveWeek,
        }
      : 'skip'
  )

  if (!weekSchedule || weekSchedule.length === 0) {
    return null
  }

  return (
    <YStack gap="$3">
      <XStack justify="space-between" items="center">
        <Text fontSize="$5" fontWeight="600">
          This Week
        </Text>
        <Button
          size="$2"
          chromeless
          iconAfter={<ChevronRight size={16} />}
          onPress={() => router.push('/(athlete)/browse')}
        >
          <Text fontSize="$2" color="$gray11">
            View Full Schedule
          </Text>
        </Button>
      </XStack>

      <XStack gap="$2" flexWrap="wrap">
        {weekSchedule.map((workout) => {
          const isToday = workout.day === effectiveDay
          const isPast = workout.day < (effectiveDay ?? 0)

          return (
            <Card
              key={workout._id}
              flex={1}
              minWidth={100}
              p="$3"
              bg={isToday ? '$green2' : isPast ? '$gray2' : '$background'}
              borderColor={isToday ? '$green7' : '$gray5'}
              borderWidth={isToday ? 2 : 1}
              opacity={isPast ? 0.6 : 1}
              pressStyle={{ scale: 0.98, opacity: 0.9 }}
              onPress={() => router.push(`/(athlete)/workout/${workout._id}`)}
            >
              <YStack gap="$1" items="center">
                <Text
                  fontSize="$1"
                  fontWeight="600"
                  color={isToday ? '$green11' : '$gray10'}
                >
                  DAY {workout.day}
                </Text>
                <Text
                  fontSize="$2"
                  fontWeight="600"
                  textAlign="center"
                  numberOfLines={2}
                  color={isToday ? '$green12' : '$gray12'}
                >
                  {workout.name}
                </Text>
                <XStack items="center" gap="$1">
                  <Dumbbell size={10} color={isToday ? '$green10' : '$gray9'} />
                  <Text fontSize="$1" color={isToday ? '$green10' : '$gray9'}>
                    {workout.exercises.length}
                  </Text>
                </XStack>
                {isToday && (
                  <Card bg="$green9" px="$2" py="$0.5" borderRadius="$10" mt="$1">
                    <Text color="white" fontSize="$1" fontWeight="600">
                      Today
                    </Text>
                  </Card>
                )}
              </YStack>
            </Card>
          )
        })}
      </XStack>
    </YStack>
  )
}


