import { Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Text, XStack, YStack } from 'tamagui'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { ProgramBar } from '../../components/first-run/ProgramBar'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { DEFAULT_TRAINING_DAYS, normalizeTrainingDays } from '../../lib/firstRun'
import { selectionFeedback } from '../../lib/haptics'

/** Monday first, as athletes plan their week. Index 0 = Sunday. */
const WEEK = [
  { index: 1, short: 'Mon', full: 'Monday' },
  { index: 2, short: 'Tue', full: 'Tuesday' },
  { index: 3, short: 'Wed', full: 'Wednesday' },
  { index: 4, short: 'Thu', full: 'Thursday' },
  { index: 5, short: 'Fri', full: 'Friday' },
  { index: 6, short: 'Sat', full: 'Saturday' },
  { index: 0, short: 'Sun', full: 'Sunday' },
]

/** Adds or removes a day, never leaving zero. */
export function toggleDay(days: readonly number[], day: number): number[] {
  if (days.includes(day)) {
    return days.length === 1 ? [...days] : days.filter((d) => d !== day)
  }
  return normalizeTrainingDays([...days, day])
}

/** Question 3: which days the athlete can train. Mon/Wed/Fri to start. */
export default function FirstRunDays() {
  const router = useRouter()
  const { draft, save } = useFirstRunDraft()
  useReachStep('days')

  const days = normalizeTrainingDays(draft?.answers.trainingDays ?? DEFAULT_TRAINING_DAYS)
  const count = `${days.length} ${days.length === 1 ? 'day' : 'days'} a week`

  const toggle = (day: number) => {
    const next = toggleDay(days, day)
    if (next.length === days.length && next.every((d, i) => d === days[i])) return
    selectionFeedback()
    void save({ trainingDays: next })
  }

  const onContinue = async () => {
    // Store the preselected days too, if the athlete kept them.
    await save({ trainingDays: days })
    router.push('/(first-run)/about')
  }

  return (
    <FirstRunScreen
      step="days"
      title="Which days can you train?"
      above={draft ? <ProgramBar answers={{ ...draft.answers, trainingDays: days }} /> : null}
      primaryLabel="Continue"
      onPrimary={onContinue}
      primaryDisabled={!draft}
      primaryTestID="first-run-continue"
    >
      <XStack justify="space-between" gap="$1.5">
        {WEEK.map((d) => {
          const on = days.includes(d.index)
          const last = on && days.length === 1
          return (
            <Pressable
              key={d.index}
              onPress={() => toggle(d.index)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={d.full}
              accessibilityHint={last ? 'Keep at least one day' : undefined}
              testID={`day-${d.short}`}
              style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
            >
              <YStack
                height={56}
                items="center"
                justify="center"
                rounded="$4"
                borderWidth={2}
                borderColor={on ? '$primary' : '$borderColor'}
                bg={on ? '$primary' : '$surface'}
              >
                <Text fontFamily="$body" fontSize={14} fontWeight="700" color={on ? 'white' : '$color11'}>
                  {d.short}
                </Text>
              </YStack>
            </Pressable>
          )
        })}
      </XStack>
      <Text
        fontFamily="$body"
        fontSize={20}
        fontWeight="700"
        color="$color12"
        testID="days-count"
        accessibilityLiveRegion="polite"
      >
        {count}
      </Text>
    </FirstRunScreen>
  )
}
