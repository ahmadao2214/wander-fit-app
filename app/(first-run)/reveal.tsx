import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Pressable, Text as RNText, View } from 'react-native'
import { Redirect, type Href } from 'expo-router'
import { useQuery } from 'convex/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Spinner } from 'tamagui'
import { api } from '../../convex/_generated/api'
import { CategoryStory } from '../../components/first-run/CategoryStory'
import { BODY } from '../../components/first-run/Night'
import { PlanView, type Rect } from '../../components/first-run/PlanView'
import { SavePlanSheet } from '../../components/first-run/SavePlanSheet'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useIntakeSport } from '../../components/first-run/useIntakeSport'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { dayLabel, firstTrainingDate, isComplete, revealProgram, weeksUntilSeason, type FirstRunAnswers } from '../../lib/firstRun'
import { STEP_ROUTES } from '../../lib/firstRunRoutes'
import { CATEGORY_HOLD_MS, HANDOFF_PLAN_DELAY_MS, NIGHT, countdownLine, weekStrip } from '../../lib/firstRunStory'

/** Where to send an athlete who reaches the reveal with a gap in the answers. */
export function firstUnanswered(answers: FirstRunAnswers): Href {
  if (!answers.sportId) return STEP_ROUTES.sport as Href
  if (answers.seasonStart === undefined) return STEP_ROUTES.season as Href
  if (!answers.trainingDays?.length) return STEP_ROUTES.days as Href
  return STEP_ROUTES.about as Href
}

/** Category, then Plan. `handoff` is the clip from the lit tile into the band. */
export type RevealPart = 'category' | 'handoff' | 'plan'

interface PlanRun {
  key: number
  from: Rect | null
  animate: boolean
}

/** The two-segment bar at the top. Each segment has a 44pt tap area. */
function StoryBar({ part, hold, onCategory, onPlan }: { part: RevealPart; hold: boolean; onCategory: () => void; onPlan: () => void }) {
  const insets = useSafeAreaInsets()
  const k = useSharedValue(hold ? 0 : 1)
  useEffect(() => {
    cancelAnimation(k)
    if (hold) {
      k.value = 0
      k.value = withTiming(1, { duration: CATEGORY_HOLD_MS, easing: Easing.linear })
    } else k.value = 1
  }, [hold, k])
  const first = useAnimatedStyle(() => ({ transform: [{ scaleX: k.value }] }))
  const onPlanPart = part !== 'category'
  const seg = (label: string, onPress: () => void, filled: ReactNode, testID: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={{ flex: 1, height: 44, justifyContent: 'center' }}>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>{filled}</View>
    </Pressable>
  )
  return (
    <View style={{ position: 'absolute', top: Math.max(0, insets.top - 14), left: 24, right: 24, flexDirection: 'row', gap: 4, zIndex: 30 }}>
      {seg(
        'Category',
        onCategory,
        <Animated.View style={[{ flex: 1, backgroundColor: '#FFFFFF', transformOrigin: 'left' }, first]} />,
        'story-category'
      )}
      {seg('Plan', onPlan, onPlanPart ? <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} /> : null, 'story-plan')}
    </View>
  )
}

/**
 * The reveal, the First Run's one long moment, as a two-part story. The
 * category holds for 3 s (a tap skips it), then the lit tile opens into the
 * plan's band. The category chip or the first segment goes back to it.
 * With Reduce Motion each part is a single still frame.
 */
export default function FirstRunReveal() {
  const insets = useSafeAreaInsets()
  const motion = useIntakeMotion()
  const { draft } = useFirstRunDraft()
  const { sport, category } = useIntakeSport()
  const [saving, setSaving] = useState(false)
  const [story, setStory] = useState<RevealPart>('category')
  const [revisit, setRevisit] = useState(false)
  const [planRun, setPlanRun] = useState<PlanRun | null>(null)
  const litTile = useRef<ComponentRef<typeof View>>(null)
  const root = useRef<ComponentRef<typeof View>>(null)
  useReachStep('reveal')

  const answers = draft?.answers
  const complete = answers ? isComplete(answers) : false
  const now = new Date()
  const program = answers && isComplete(answers) ? revealProgram(answers, now) : null
  const templates = useQuery(
    api.programTemplates.getWeekOverview,
    sport && program ? { gppCategoryId: sport.gppCategoryId, phase: 'GPP', skillLevel: program.skillLevel, week: 1 } : 'skip'
  )
  const ready = !!(program && sport && category && templates !== undefined && motion.known)

  const nextKey = () => (planRun?.key ?? 0) + 1
  const toPlan = () => {
    if (story !== 'category') return
    if (revisit || !motion.moving) {
      // A revisit goes back to the finished plan; Reduce Motion swaps to a still one.
      setPlanRun({ key: nextKey(), from: null, animate: false })
      setStory('plan')
      return
    }
    const tile = litTile.current
    const page = root.current
    const start = (from: Rect | null) => {
      setPlanRun({ key: nextKey(), from, animate: true })
      setStory(from ? 'handoff' : 'plan')
    }
    if (!tile || !page) return start(null)
    // The handoff: measure the lit tile, then open it into the band.
    page.measureInWindow((px, py) => {
      tile.measureInWindow((x, y, width, height) => start(width > 0 ? { x: x - px, y: y - py, width, height } : null))
    })
  }
  const toCategory = () => {
    setRevisit(true)
    setStory('category')
  }

  // The category holds, then moves on by itself (unless revisited).
  const holding = ready && story === 'category' && !revisit
  useEffect(() => {
    if (!holding) return
    const t = setTimeout(toPlan, motion.moving ? CATEGORY_HOLD_MS : CATEGORY_HOLD_MS + 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding])
  // After the clip opens, the category page goes and the plan stays.
  useEffect(() => {
    if (story !== 'handoff') return
    const t = setTimeout(() => setStory('plan'), HANDOFF_PLAN_DELAY_MS + 10)
    return () => clearTimeout(t)
  }, [story])

  if (draft && !complete) return <Redirect href={firstUnanswered(draft.answers)} />

  if (!ready || !program || !sport || !category || !answers || !isComplete(answers)) {
    return (
      <View style={{ flex: 1, backgroundColor: NIGHT.ink, alignItems: 'center', justifyContent: 'center', gap: 12 }} testID="reveal-loading">
        <Spinner size="large" color="$primaryText" />
        <RNText style={{ fontFamily: BODY, color: NIGHT.fg2 }}>Building your plan…</RNText>
      </View>
    )
  }

  const trainingDays = answers.trainingDays
  const week = weekStrip(trainingDays, templates ?? [], now)
  const weeks = answers.seasonStart ? weeksUntilSeason(answers.seasonStart, now) : 0
  const plan = (openFrom: Rect | null, animate: boolean) => (
    <PlanView
      sportName={sport.name}
      category={category}
      countdown={countdownLine(answers.seasonStart, weeks, program.programWeeks)}
      weeksPerPhase={program.weeksPerPhase}
      programWeeks={program.programWeeks}
      sessionCount={program.sessionCount}
      noSeason={answers.seasonStart === null}
      week={week}
      trainingDays={trainingDays}
      animate={animate}
      openFrom={openFrom}
      onCategory={toCategory}
      onSave={() => setSaving(true)}
    />
  )

  return (
    <View ref={root} collapsable={false} style={{ flex: 1, backgroundColor: NIGHT.ink }}>
      {story !== 'plan' ? (
        <Pressable
          onPress={toPlan}
          accessibilityRole="button"
          accessibilityLabel={revisit ? 'Go back to your plan' : 'See your plan'}
          testID="reveal-category-page"
          style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
        >
          <CategoryStory
            sportName={sport.name}
            category={category}
            settled={!motion.moving || revisit}
            leaving={story === 'handoff'}
            revisit={revisit}
            litTileRef={litTile}
          />
        </Pressable>
      ) : null}

      {/* One plan instance from the handoff on, so its beats never restart. */}
      {planRun && story !== 'category' ? (
        <View key={planRun.key} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          {plan(planRun.from, planRun.animate)}
        </View>
      ) : null}

      <StoryBar part={story} hold={holding && motion.moving} onCategory={() => story === 'plan' && toCategory()} onPlan={toPlan} />
      <SavePlanSheet open={saving} onOpenChange={setSaving} nextLabel={dayLabel(firstTrainingDate(trainingDays, now), now)} />
    </View>
  )
}
