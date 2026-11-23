import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { IntakeFrame } from '../../components/first-run/IntakeFrame'
import {
  BODY,
  BODY_BOLD,
  BODY_SEMI,
  DISPLAY,
  Headline,
  Label,
  SportShape,
  headlineSize,
} from '../../components/first-run/Night'
import { PAGE_EASE } from '../../components/first-run/intakeMotion'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useIntakeSport } from '../../components/first-run/useIntakeSport'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { evaluateBirthDate } from '../../lib/ageGate'
import { ageGateLock } from '../../lib/ageGateLockStorage'
import { analytics, FIRST_RUN_STEP_INDEX } from '../../lib/analytics'
import { AGE_GROUP_CHOICES, YEARS_CHOICES, skillLevelLabel } from '../../lib/firstRun'
import { NIGHT } from '../../lib/firstRunStory'
import { selectionFeedback } from '../../lib/haptics'

type Question = 'age' | 'years'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** A month from the birth question's grid: "Jan" on screen, "January" read aloud. */
function MonthChip({
  name,
  selected,
  onPress,
  testID,
}: {
  name: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={name}
      testID={testID}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: '22%',
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? NIGHT.fg : NIGHT.ink2,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <RNText
        style={{
          fontFamily: DISPLAY,
          fontSize: 22,
          letterSpacing: 1,
          color: selected ? NIGHT.ink : NIGHT.fg,
        }}
      >
        {name.slice(0, 3).toUpperCase()}
      </RNText>
    </Pressable>
  )
}

/** Which question shows first: age, unless it's answered and years isn't. */
export function firstQuestion(answers: { ageGroup?: string; years?: string }): Question {
  return answers.ageGroup && !answers.years ? 'years' : 'age'
}

/** A value on the card. A new answer stamps in: it lands from a little larger. */
function Stamp({
  value,
  moving,
  align,
  testID,
}: {
  value: string
  moving: boolean
  align: 'left' | 'right'
  testID: string
}) {
  const k = useSharedValue(1)
  const last = useRef(value)
  useEffect(() => {
    if (value === last.current) return
    last.current = value
    if (!moving) return
    k.value = 0
    k.value = withTiming(1, { duration: 260, easing: PAGE_EASE })
  }, [value, moving, k])
  const style = useAnimatedStyle(() => ({
    opacity: k.value,
    transform: [{ scale: 1.35 - 0.35 * k.value }],
  }))
  return (
    <Animated.View style={[{ minWidth: 60 }, style]}>
      <RNText
        style={{
          fontFamily: DISPLAY,
          fontSize: 24,
          lineHeight: 26,
          color: NIGHT.ink,
          textAlign: align,
        }}
        testID={testID}
      >
        {value}
      </RNText>
    </Animated.View>
  )
}

function Choice({
  label,
  detail,
  selected,
  color,
  onPress,
  testID,
}: {
  label: string
  detail?: string
  selected: boolean
  color: string
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      testID={testID}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {/* A broadcast lower-third: a stripe of the category color on the left. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingVertical: 20,
          paddingLeft: 20,
          paddingRight: 16,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          borderLeftWidth: 6,
          borderLeftColor: color,
          backgroundColor: selected ? NIGHT.fg : NIGHT.ink2,
        }}
      >
        <RNText
          style={{
            fontFamily: DISPLAY,
            fontSize: 36,
            lineHeight: 38,
            color: selected ? NIGHT.ink : NIGHT.fg,
          }}
        >
          {label}
        </RNText>
        {detail ? (
          <RNText
            style={{ fontFamily: BODY_BOLD, fontSize: 13, color: selected ? '#44506A' : NIGHT.fg2 }}
          >
            {detail}
          </RNText>
        ) : null}
      </View>
    </Pressable>
  )
}

/**
 * Questions 4 and 5 on a player card: birth month and year, then years
 * training, one labeled question at a time. The birth date becomes an age
 * group, and only the age group stamps onto the card and into the draft; the
 * month and year never leave this screen's state. A birth date under the
 * minimum age locks the step on the device and shows a calm dead end. The
 * years answer leads straight into the reveal.
 */
export default function FirstRunAbout() {
  const router = useRouter()
  const motion = useIntakeMotion()
  const { width } = useWindowDimensions()
  const { draft, save } = useFirstRunDraft()
  const { sport, category, ground } = useIntakeSport()
  useReachStep('about')

  const ageGroup = draft?.answers.ageGroup
  const years = draft?.answers.years
  // Latched once the draft loads, then moved only by an answer, so a save
  // can't flip the question back while its stamp plays.
  const [question, setQuestion] = useState<Question | null>(null)
  useEffect(() => {
    if (draft && question === null) setQuestion(firstQuestion(draft.answers))
  }, [draft, question])
  const shown: Question = question ?? firstQuestion({ ageGroup, years })
  const color = category?.color ?? NIGHT.action
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  // Back from the reveal ("Change my answers", or swipe-back), the card
  // starts over at age so either answer can be fixed. Only a return resets
  // it, never a save, so an answer's beat still plays out.
  const left = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (left.current) {
        left.current = false
        timers.current.forEach(clearTimeout)
        timers.current = []
        setQuestion(null)
      }
      return () => {
        left.current = true
      }
    }, [])
  )
  const later = (ms: number, fn: () => void) => {
    if (!motion.moving) return fn()
    timers.current.push(setTimeout(fn, ms))
  }

  // The birth question's answers. Held here only, never saved or tracked.
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [birthYear, setBirthYear] = useState('')
  const [yearError, setYearError] = useState(false)
  // Once a birth date falls under the minimum age, this device's age step
  // stays closed, whatever is entered later.
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    let live = true
    void ageGateLock.isLocked().then((locked) => {
      if (live && locked) setClosed(true)
    })
    return () => {
      live = false
    }
  }, [])
  const birthReady = birthMonth !== null && /^\d{4}$/.test(birthYear)

  const onBirthContinue = async () => {
    if (birthMonth === null || !birthReady) return
    Keyboard.dismiss()
    if (await ageGateLock.isLocked()) {
      setClosed(true)
      return
    }
    const result = evaluateBirthDate(birthMonth, Number(birthYear), new Date())
    if (!result.eligible && result.reason === 'invalid_birth_date') {
      setYearError(true)
      return
    }
    setBirthMonth(null)
    setBirthYear('')
    if (!result.eligible) {
      await ageGateLock.lock()
      // Drop any age group from an earlier answer, so no step can go on.
      void save({ ageGroup: undefined })
      setClosed(true)
      return
    }
    selectionFeedback()
    void save({ ageGroup: result.ageGroup })
    later(320, () => setQuestion('years'))
  }

  // The choices slide over from the right when the question changes.
  const slide = useSharedValue(1)
  useEffect(() => {
    if (!motion.moving) return
    slide.value = 0
    slide.value = withTiming(1, { duration: 280, easing: PAGE_EASE })
  }, [shown, motion.moving, slide])
  const slideStyle = useAnimatedStyle(() => ({
    opacity: slide.value,
    transform: [{ translateX: 24 * (1 - slide.value) }],
  }))

  const age = AGE_GROUP_CHOICES.find((c) => c.value === ageGroup)
  const level = years ? skillLevelLabel(years) : undefined

  if (closed) {
    return (
      <IntakeFrame step="about" ground={ground} moving={motion.moving} showTop={false}>
        <View style={{ flex: 1, justifyContent: 'center' }} testID="age-gate-closed">
          <RNText
            style={{
              fontFamily: BODY_SEMI,
              fontSize: 20,
              lineHeight: 28,
              color: NIGHT.fg,
              textAlign: 'center',
            }}
            accessibilityRole="header"
          >
            WanderFit isn't available for your age group yet.
          </RNText>
        </View>
      </IntakeFrame>
    )
  }

  return (
    <IntakeFrame
      step="about"
      ground={ground}
      moving={motion.moving}
      backdrop={sport ? { name: sport.name } : null}
      primary={
        shown === 'age'
          ? {
              label: 'Continue',
              onPress: () => void onBirthContinue(),
              disabled: !birthReady,
              testID: 'birth-continue',
            }
          : null
      }
    >
      <Headline size={headlineSize(54, width)} moving={motion.moving}>
        About you
      </Headline>

      <View
        style={{
          width: 200,
          height: 240,
          alignSelf: 'center',
          marginTop: 16,
          borderRadius: 16,
          backgroundColor: NIGHT.fg,
          padding: 12,
        }}
        accessible
        accessibilityLabel={`Player card. Age group ${age?.range ?? 'not answered'}. Experience ${level ?? 'not answered'}.`}
        testID="player-card"
      >
        <View
          style={{
            flex: 1,
            borderRadius: 8,
            backgroundColor: color,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sport ? <SportShape name={sport.name} size={150} /> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <RNText
            style={{ fontFamily: BODY_BOLD, fontSize: 12, letterSpacing: 1, color: '#55617A' }}
          >
            AGE GROUP
          </RNText>
          <RNText
            style={{ fontFamily: BODY_BOLD, fontSize: 12, letterSpacing: 1, color: '#55617A' }}
          >
            EXPERIENCE
          </RNText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Stamp value={age?.range ?? '—'} moving={motion.moving} align="left" testID="card-age" />
          <Stamp value={level ?? '—'} moving={motion.moving} align="right" testID="card-years" />
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 16 }} />

      <RNText
        style={{
          fontFamily: DISPLAY,
          fontSize: 24,
          letterSpacing: 1,
          color: NIGHT.fg2,
          marginBottom: 8,
        }}
        accessibilityRole="header"
        nativeID="about-question"
        testID="about-question"
      >
        {shown === 'age' ? 'When were you born?' : 'YEARS TRAINING FOR YOUR SPORT'}
      </RNText>
      {shown === 'age' ? (
        <Animated.View style={[{ gap: 8 }, slideStyle]}>
          <Label>Month</Label>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Birth month"
          >
            {MONTHS.map((name, i) => (
              <MonthChip
                key={name}
                name={name}
                selected={birthMonth === i + 1}
                testID={`birth-month-${i + 1}`}
                onPress={() => {
                  selectionFeedback()
                  setBirthMonth(i + 1)
                }}
              />
            ))}
          </View>
          <Label style={{ marginTop: 8 }}>Year</Label>
          <TextInput
            value={birthYear}
            onChangeText={(text) => {
              setBirthYear(text.replace(/\D/g, '').slice(0, 4))
              setYearError(false)
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor={NIGHT.fg2}
            returnKeyType="done"
            onSubmitEditing={() => void onBirthContinue()}
            accessibilityLabel="Birth year"
            nativeID="birth-year"
            testID="birth-year"
            style={{
              height: 56,
              borderRadius: 10,
              paddingHorizontal: 16,
              backgroundColor: NIGHT.ink2,
              borderWidth: 1,
              borderColor: yearError ? '#F87171' : NIGHT.line,
              color: NIGHT.fg,
              fontFamily: DISPLAY,
              fontSize: 28,
              letterSpacing: 2,
            }}
          />
          {yearError ? (
            <RNText
              style={{ fontFamily: BODY, fontSize: 14, color: '#FCA5A5' }}
              accessibilityLiveRegion="polite"
              testID="birth-year-error"
            >
              Check the year.
            </RNText>
          ) : null}
        </Animated.View>
      ) : (
        <Animated.View
          style={[{ gap: 8 }, slideStyle]}
          accessibilityRole="radiogroup"
          accessibilityLabelledBy="about-question"
        >
          {YEARS_CHOICES.map((c) => (
            <Choice
              key={c.value}
              label={c.label}
              color={color}
              selected={years === c.value}
              testID={`years-${c.value}`}
              onPress={async () => {
                selectionFeedback()
                await save({ years: c.value })
                if (!ageGroup) {
                  setQuestion('age')
                  return
                }
                // A beat after the second answer, the reveal starts.
                analytics.trackFirstRunStepAdvanced({
                  step: 'about',
                  step_index: FIRST_RUN_STEP_INDEX.about,
                  age_group: ageGroup,
                })
                later(650, () => router.push('/(first-run)/reveal'))
              }}
            />
          ))}
        </Animated.View>
      )}
    </IntakeFrame>
  )
}
