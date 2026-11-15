import { Text, XStack, YStack } from 'tamagui'

export interface DayOneWorkout {
  name: string
  estimatedDurationMinutes: number
  exercises: { section?: string; exercise?: { name: string } | null }[]
}

const MAX_LISTED = 4

/** The main lifts, not the warm-up, so the card shows what the day is. */
export function mainExerciseNames(workout: DayOneWorkout): string[] {
  const names = workout.exercises
    .filter((e) => e.section !== 'warmup' && e.exercise?.name)
    .map((e) => e.exercise!.name)
  return [...new Set(names)]
}

/** The athlete's real Day 1, read from the template they'll get. */
export function DayOneCard({ workout, dateLabel }: { workout: DayOneWorkout; dateLabel?: string }) {
  const names = mainExerciseNames(workout)
  const listed = names.slice(0, MAX_LISTED)
  const more = names.length - listed.length

  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$5"
      p="$4"
      gap="$3"
      testID="day-one-card"
    >
      <XStack justify="space-between" items="baseline" gap="$3">
        <Text fontFamily="$body" fontSize={13} fontWeight="700" color="$primary">
          Day 1{dateLabel ? ` · ${dateLabel}` : ''}
        </Text>
        <Text fontFamily="$body" fontSize={13} color="$color11" style={{ fontVariant: ['tabular-nums'] }}>
          About {workout.estimatedDurationMinutes} min
        </Text>
      </XStack>
      <Text fontFamily="$body" fontSize={20} lineHeight={26} fontWeight="700" color="$color12" testID="day-one-name">
        {workout.name}
      </Text>
      <YStack gap="$1.5">
        {listed.map((name) => (
          <Text key={name} fontFamily="$body" fontSize={15} color="$color12">
            {name}
          </Text>
        ))}
        {more > 0 ? (
          <Text fontFamily="$body" fontSize={15} color="$color11">
            +{more} more
          </Text>
        ) : null}
      </YStack>
    </YStack>
  )
}
