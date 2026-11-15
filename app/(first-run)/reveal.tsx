import { useState } from 'react'
import { Redirect, type Href } from 'expo-router'
import { useQuery } from 'convex/react'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Spinner, Text, YStack } from 'tamagui'
import { api } from '../../convex/_generated/api'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { DayOneCard } from '../../components/first-run/DayOneCard'
import { PhaseBar } from '../../components/first-run/PhaseBar'
import { SavePlanSheet } from '../../components/first-run/SavePlanSheet'
import { useReachStep } from '../../components/first-run/useReachStep'
import { SportIcon } from '../../components/sport-icon/SportIcon'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { dayLabel, firstTrainingDate, isComplete, revealProgram, type FirstRunAnswers } from '../../lib/firstRun'
import { STEP_ROUTES } from '../../lib/firstRunRoutes'

/** Where to send an athlete who reaches the reveal with a gap in the answers. */
export function firstUnanswered(answers: FirstRunAnswers): Href {
  if (!answers.sportId) return STEP_ROUTES.sport as Href
  if (answers.seasonStart === undefined) return STEP_ROUTES.season as Href
  if (!answers.trainingDays?.length) return STEP_ROUTES.days as Href
  return STEP_ROUTES.about as Href
}

/**
 * The reveal, and the First Run's one animated moment: the sport icon plays
 * once while the plan settles in under it. With Reduce Motion on (or not yet
 * known) and on platforms without the animation, everything is simply there.
 */
export default function FirstRunReveal() {
  const { draft } = useFirstRunDraft()
  const reduced = useReducedMotion()
  const [saving, setSaving] = useState(false)
  useReachStep('reveal')

  const answers = draft?.answers
  const complete = answers ? isComplete(answers) : false
  const sports = useQuery(api.sports.list)
  const categories = useQuery(api.sports.getCategories)
  const sport = sports?.find((s) => s._id === answers?.sportId)
  const category = categories?.find((c) => c.categoryId === sport?.gppCategoryId)

  const now = new Date()
  const program = complete && answers && isComplete(answers) ? revealProgram(answers, now) : null
  const workout = useQuery(
    api.programTemplates.getWorkout,
    sport && program
      ? { gppCategoryId: sport.gppCategoryId, phase: 'GPP', skillLevel: program.skillLevel, week: 1, day: 1 }
      : 'skip'
  )

  if (draft && !complete) return <Redirect href={firstUnanswered(draft.answers)} />

  const ready = !!(program && sport && workout !== undefined && reduced !== null)
  const animate = reduced === false
  const enter = (order: number) => (animate ? FadeInUp.delay(order * 70).duration(280) : undefined)

  return (
    <>
      <FirstRunScreen
        step="reveal"
        title={sport ? `Your ${sport.name} plan` : 'Your plan'}
        primaryLabel="Save my plan"
        primaryDisabled={!ready || !workout}
        onPrimary={() => setSaving(true)}
        primaryTestID="first-run-save"
      >
        {!ready || !program || !sport ? (
          <YStack py="$10" items="center" gap="$3" testID="reveal-loading">
            <Spinner size="large" color="$primary" />
            <Text fontFamily="$body" color="$color11">
              Building your plan…
            </Text>
          </YStack>
        ) : (
          <YStack gap="$5">
            <Animated.View entering={enter(0)}>
              <YStack items="center" gap="$3">
                <SportIcon name={sport.name} mode="once" size={112} bg="$brand2" testID="reveal-icon" />
                {category ? (
                  <Text fontFamily="$body" fontSize={17} color="$color11" text="center" testID="reveal-category">
                    {sport.name} trains for {category.shortName}.
                  </Text>
                ) : null}
              </YStack>
            </Animated.View>

            <Animated.View entering={enter(1)}>
              {workout ? (
                <DayOneCard workout={workout} dateLabel={dayLabel(firstTrainingDate(answers?.trainingDays, now), now)} />
              ) : (
                <Text fontFamily="$body" fontSize={15} color="$color11" testID="reveal-no-workout">
                  Your first workout isn't ready yet. Try again in a moment.
                </Text>
              )}
            </Animated.View>

            <Animated.View entering={enter(2)}>
              <YStack gap="$3">
                <PhaseBar weeksPerPhase={program.weeksPerPhase} />
                <Text
                  fontFamily="$body"
                  fontSize={16}
                  fontWeight="600"
                  color="$color12"
                  style={{ fontVariant: ['tabular-nums'] }}
                  testID="reveal-sessions"
                >
                  {program.sessionCount} sessions over {program.programWeeks} weeks
                </Text>
              </YStack>
            </Animated.View>
          </YStack>
        )}
      </FirstRunScreen>
      <SavePlanSheet open={saving} onOpenChange={setSaving} />
    </>
  )
}
