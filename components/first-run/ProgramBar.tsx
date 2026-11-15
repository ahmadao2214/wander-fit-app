import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Text, YStack } from 'tamagui'
import type { FirstRunAnswers } from '../../lib/firstRun'
import { normalizeTrainingDays, weeksUntilSeason } from '../../lib/firstRun'

/** Pieces of the plan built so far, in the order the athlete answered them. */
export function programBarParts(
  answers: FirstRunAnswers,
  sportName: string | undefined,
  categoryName: string | undefined,
  now: Date
): string[] {
  const parts: string[] = []
  if (sportName) parts.push(categoryName ? `${sportName} · ${categoryName}` : sportName)
  if (answers.seasonStart === null) parts.push('No set season')
  else if (answers.seasonStart) {
    const weeks = weeksUntilSeason(answers.seasonStart, now)
    parts.push(`Season in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`)
  }
  if (answers.trainingDays) {
    const days = normalizeTrainingDays(answers.trainingDays).length
    parts.push(`${days} ${days === 1 ? 'day' : 'days'} a week`)
  }
  return parts
}

/**
 * "Your program" grows as the athlete answers, so each answer visibly
 * builds something. Text only; nothing animates here.
 */
export function ProgramBar({ answers }: { answers: FirstRunAnswers }) {
  const sports = useQuery(api.sports.list)
  const categories = useQuery(api.sports.getCategories)
  const sport = sports?.find((s) => s._id === answers.sportId)
  const category = categories?.find((c) => c.categoryId === sport?.gppCategoryId)
  const parts = programBarParts(answers, sport?.name, category?.shortName, new Date())

  const empty = parts.length === 0

  // Always the same height, so answering never pushes the question down.
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$4"
      px="$3"
      py="$2.5"
      gap="$1"
      height={84}
      justify="center"
      accessible
      accessibilityLabel={empty ? 'Your program: builds as you answer' : `Your program: ${parts.join(', ')}`}
      testID="program-bar"
    >
      <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color11">
        Your program
      </Text>
      <Text
        fontFamily="$body"
        fontSize={15}
        lineHeight={20}
        fontWeight="600"
        color={empty ? '$color10' : '$color12'}
        numberOfLines={2}
        testID={empty ? 'program-bar-empty' : 'program-bar-text'}
      >
        {empty ? 'Builds as you answer' : parts.join(' · ')}
      </Text>
    </YStack>
  )
}
