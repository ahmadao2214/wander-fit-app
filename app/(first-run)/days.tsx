import { Text as RNText, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { IntakeFrame } from '../../components/first-run/IntakeFrame'
import { DayTile } from '../../components/first-run/DayTile'
import { BODY_SEMI, DISPLAY, Headline, headlineSize } from '../../components/first-run/Night'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useIntakeSport } from '../../components/first-run/useIntakeSport'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { analytics, FIRST_RUN_STEP_INDEX } from '../../lib/analytics'
import { DEFAULT_TRAINING_DAYS, normalizeTrainingDays } from '../../lib/firstRun'
import { DAY_FULL, DAY_SHORT, NIGHT, WEEK_ORDER, daysSummary, movementFamily } from '../../lib/firstRunStory'
import { selectionFeedback } from '../../lib/haptics'

/** Adds or removes a day, never leaving zero. */
export function toggleDay(days: readonly number[], day: number): number[] {
  if (days.includes(day)) {
    return days.length === 1 ? [...days] : days.filter((d) => d !== day)
  }
  return normalizeTrainingDays([...days, day])
}

/**
 * Question 3: which days the athlete can train, centered on the screen. Mon,
 * Wed and Fri come preselected and fill one after another as the page arrives.
 */
export default function FirstRunDays() {
  const router = useRouter()
  const motion = useIntakeMotion()
  const { width } = useWindowDimensions()
  const { draft, save } = useFirstRunDraft()
  const { sport, ground } = useIntakeSport()
  useReachStep('days')

  const days = normalizeTrainingDays(draft?.answers.trainingDays ?? DEFAULT_TRAINING_DAYS)
  const family = movementFamily(sport?.name)
  const summary = daysSummary(days)
  const preselected = WEEK_ORDER.filter((d) => days.includes(d))

  const toggle = (day: number) => {
    const next = toggleDay(days, day)
    if (next.length === days.length && next.every((d, i) => d === days[i])) return
    selectionFeedback()
    void save({ trainingDays: next })
  }

  return (
    <IntakeFrame
      step="days"
      ground={ground}
      moving={motion.moving}
      backdrop={sport ? { name: sport.name } : null}
      primary={{
        label: 'Continue',
        disabled: !draft,
        onPress: async () => {
          // Store the preselected days too, if the athlete kept them.
          await save({ trainingDays: days })
          analytics.trackFirstRunStepAdvanced({
            step: 'days',
            step_index: FIRST_RUN_STEP_INDEX.days,
            training_days_per_week: days.length,
          })
          router.push('/(first-run)/about')
        },
        testID: 'first-run-continue',
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <Headline size={headlineSize(58, width)} moving={motion.moving} align="center">
          Which days can you train?
        </Headline>
        {/* Rendered once the draft is in, so the arrival fill plays for the real days. */}
        {draft ? (
          <View style={{ flexDirection: 'row', gap: 6, width: '100%' }}>
            {WEEK_ORDER.map((d) => {
              const on = days.includes(d)
              return (
                <DayTile
                  key={d}
                  label={DAY_SHORT[d].slice(0, 1)}
                  full={DAY_FULL[d]}
                  on={on}
                  family={family}
                  sportName={sport?.name}
                  moving={motion.moving}
                  enterDelay={420 + Math.max(0, preselected.indexOf(d)) * 260}
                  onPress={() => toggle(d)}
                  hint={on && days.length === 1 ? 'Keep at least one day' : undefined}
                  testID={`day-${DAY_SHORT[d]}`}
                />
              )
            })}
          </View>
        ) : (
          <View style={{ height: 132 }} />
        )}
        <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
          <RNText style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 28, color: NIGHT.fg, letterSpacing: 1 }} testID="days-count">
            {summary.count.toUpperCase()}
          </RNText>
          <RNText style={{ fontFamily: BODY_SEMI, fontSize: 14, color: NIGHT.fg2, marginTop: 6 }} testID="days-list">
            {summary.list}
          </RNText>
        </View>
      </View>
    </IntakeFrame>
  )
}
