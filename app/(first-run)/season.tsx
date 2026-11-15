import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Slider, Text, XStack, YStack } from 'tamagui'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { ProgramBar } from '../../components/first-run/ProgramBar'
import { ChoiceRow } from '../../components/first-run/ChoiceRow'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import {
  DEFAULT_SEASON_WEEKS,
  MAX_SEASON_WEEKS,
  formatSeasonDate,
  seasonStartForWeeks,
  weeksUntilSeason,
} from '../../lib/firstRun'

const MONTH_MARKS = ['Now', '3 mo', '6 mo', '9 mo', '12 mo']

/** Question 2: when the first game is, which sets the length of each phase. */
export default function FirstRunSeason() {
  const router = useRouter()
  const { draft, save } = useFirstRunDraft()
  useReachStep('season')

  const now = new Date()
  const stored = draft?.answers.seasonStart
  const [weeks, setWeeks] = useState<number | null>(null)
  const [noSeason, setNoSeason] = useState<boolean | null>(null)

  // Until the athlete touches anything, show what the draft holds.
  const shownNoSeason = noSeason ?? stored === null
  const shownWeeks = weeks ?? (stored ? weeksUntilSeason(stored, now) : DEFAULT_SEASON_WEEKS)
  const date = formatSeasonDate(seasonStartForWeeks(shownWeeks, now))
  const away = `${shownWeeks} ${shownWeeks === 1 ? 'week' : 'weeks'} away`

  const answers = draft
    ? { ...draft.answers, seasonStart: shownNoSeason ? null : seasonStartForWeeks(shownWeeks, now) }
    : null

  const onContinue = async () => {
    await save({ seasonStart: shownNoSeason ? null : seasonStartForWeeks(shownWeeks, now) })
    router.push('/(first-run)/days')
  }

  return (
    <FirstRunScreen
      step="season"
      title="When's your first game?"
      above={answers ? <ProgramBar answers={answers} /> : null}
      primaryLabel="Continue"
      onPrimary={onContinue}
      primaryDisabled={!draft}
      primaryTestID="first-run-continue"
    >
      <YStack gap="$4" opacity={shownNoSeason ? 0.45 : 1}>
        <YStack gap="$1">
          <Text
            fontFamily="$body"
            fontSize={32}
            lineHeight={38}
            fontWeight="700"
            color="$color12"
            style={{ fontVariant: ['tabular-nums'] }}
            testID="season-weeks"
            accessibilityLiveRegion="polite"
          >
            {away}
          </Text>
          <Text fontFamily="$body" fontSize={16} color="$color11" testID="season-date">
            Around {date}
          </Text>
        </YStack>

        <YStack gap="$2">
          <Slider
            value={[shownWeeks]}
            min={1}
            max={MAX_SEASON_WEEKS}
            step={1}
            onValueChange={([value]) => {
              setWeeks(value)
              setNoSeason(false)
            }}
            accessibilityLabel="Weeks until your first game"
            aria-valuetext={away}
            testID="season-slider"
          >
            <Slider.Track bg="$color5" height={6} rounded={3}>
              <Slider.TrackActive bg="$primary" />
            </Slider.Track>
            <Slider.Thumb index={0} size={28} bg="$primary" borderWidth={3} borderColor="white" circular elevate />
          </Slider>
          <XStack justify="space-between">
            {MONTH_MARKS.map((mark) => (
              <Text key={mark} fontFamily="$body" fontSize={12} color="$color10">
                {mark}
              </Text>
            ))}
          </XStack>
        </YStack>
      </YStack>

      <ChoiceRow
        label="No set season"
        detail="We'll build a 12-week plan"
        selected={shownNoSeason}
        onPress={() => setNoSeason(!shownNoSeason)}
        testID="season-none"
      />
    </FirstRunScreen>
  )
}
