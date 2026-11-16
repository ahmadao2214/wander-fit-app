import { useState } from 'react'
import { Pressable, Text as RNText, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { IntakeFrame } from '../../components/first-run/IntakeFrame'
import { BODY, BODY_BOLD, BODY_SEMI, DISPLAY, Headline, headlineSize } from '../../components/first-run/Night'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useIntakeSport } from '../../components/first-run/useIntakeSport'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { DEFAULT_SEASON_WEEKS, MAX_SEASON_WEEKS, seasonStartForWeeks, weeksUntilSeason } from '../../lib/firstRun'
import { NIGHT, monthGrid } from '../../lib/firstRunStory'
import { selectionFeedback } from '../../lib/haptics'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthOf(iso: string): { y: number; m: number } {
  const [y, m] = iso.split('-').map(Number)
  return { y, m: m - 1 }
}

/** Months the picker can show: this one through the last one inside `MAX_SEASON_WEEKS`. */
export function monthBounds(now: Date): { first: { y: number; m: number }; last: { y: number; m: number } } {
  return { first: { y: now.getFullYear(), m: now.getMonth() }, last: monthOf(seasonStartForWeeks(MAX_SEASON_WEEKS, now)) }
}

/** Question 2: when the first game is, on a month calendar. It sets the length of each phase. */
export default function FirstRunSeason() {
  const router = useRouter()
  const motion = useIntakeMotion()
  const { width } = useWindowDimensions()
  const { fly } = useLocalSearchParams<{ fly?: string }>()
  const { draft, save } = useFirstRunDraft()
  const { sport, ground } = useIntakeSport()
  useReachStep('season')

  const now = new Date()
  const stored = draft?.answers.seasonStart
  const noSeason = stored === null
  // Untouched, the picker shows the 12-week default.
  const picked = stored ?? seasonStartForWeeks(DEFAULT_SEASON_WEEKS, now)
  const weeks = weeksUntilSeason(picked, now)
  const [month, setMonth] = useState(() => monthOf(picked))
  const bounds = monthBounds(now)
  const canPrev = month.y * 12 + month.m > bounds.first.y * 12 + bounds.first.m
  const canNext = month.y * 12 + month.m < bounds.last.y * 12 + bounds.last.m
  const latest = seasonStartForWeeks(MAX_SEASON_WEEKS, now)
  const cells = monthGrid(month.y, month.m, now)
  const title = new Date(month.y, month.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const pick = (iso: string) => {
    selectionFeedback()
    void save({ seasonStart: iso })
  }
  const shift = (by: number) => {
    const d = new Date(month.y, month.m + by, 1)
    setMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <IntakeFrame
      step="season"
      ground={ground}
      moving={motion.moving}
      backdrop={sport ? { name: sport.name, fly: fly === '1' } : null}
      primary={{
        label: 'Continue',
        disabled: !draft,
        onPress: async () => {
          await save({ seasonStart: noSeason ? null : picked })
          router.push('/(first-run)/days')
        },
        testID: 'first-run-continue',
      }}
    >
      <Headline size={headlineSize(64, width)} moving={motion.moving}>
        When's your first game?
      </Headline>

      <View style={{ opacity: noSeason ? 0.35 : 1, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <RNText
            style={{ fontFamily: DISPLAY, fontSize: 96, lineHeight: 88, paddingTop: 10, color: NIGHT.fg, fontVariant: ['tabular-nums'] }}
            testID="season-weeks"
            accessibilityLabel={`${weeks} ${weeks === 1 ? 'week' : 'weeks'} away`}
            accessibilityLiveRegion="polite"
          >
            {weeks}
          </RNText>
          <RNText style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 30, color: NIGHT.fg2, paddingBottom: 12 }}>
            {weeks === 1 ? 'WEEK\nAWAY' : 'WEEKS\nAWAY'}
          </RNText>
        </View>

        <View style={{ marginTop: 16 }} testID="season-calendar">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => canPrev && shift(-1)}
              disabled={!canPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              testID="season-prev-month"
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canPrev ? 1 : 0.3 }}
            >
              <ChevronLeft size={22} color={NIGHT.fg} />
            </Pressable>
            <RNText style={{ fontFamily: DISPLAY, fontSize: 26, color: NIGHT.fg, letterSpacing: 0.8 }} testID="season-month">
              {title.toUpperCase()}
            </RNText>
            <Pressable
              onPress={() => canNext && shift(1)}
              disabled={!canNext}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              testID="season-next-month"
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canNext ? 1 : 0.3 }}
            >
              <ChevronRight size={22} color={NIGHT.fg} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((d, i) => (
              <RNText
                key={i}
                style={{ flex: 1, textAlign: 'center', fontFamily: BODY_BOLD, fontSize: 12, color: NIGHT.fg2, paddingVertical: 8 }}
              >
                {d}
              </RNText>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((c, i) => {
              if (!c) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
              const disabled = c.disabled || c.iso > latest
              const on = !noSeason && c.iso === picked
              const label = new Date(month.y, month.m, c.day).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
              return (
                <Pressable
                  key={c.iso}
                  disabled={disabled}
                  onPress={() => pick(c.iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled }}
                  accessibilityLabel={label}
                  testID={`season-day-${c.iso}`}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? NIGHT.fg : 'transparent',
                    }}
                  >
                    <RNText
                      style={{
                        fontFamily: BODY_SEMI,
                        fontSize: 14,
                        color: disabled ? NIGHT.line : on ? NIGHT.ink : NIGHT.fg,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {c.day}
                    </RNText>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => {
          selectionFeedback()
          void save({ seasonStart: noSeason ? picked : null })
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: noSeason }}
        accessibilityLabel="No set season, we'll build a 12-week plan"
        testID="season-none"
        style={({ pressed }) => ({
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderRadius: 12,
          backgroundColor: NIGHT.ink2,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <View>
          <RNText style={{ fontFamily: BODY_SEMI, fontSize: 15, color: NIGHT.fg }}>No set season</RNText>
          <RNText style={{ fontFamily: BODY, fontSize: 13, color: NIGHT.fg2, marginTop: 2 }}>We'll build a 12-week plan</RNText>
        </View>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: noSeason ? 7 : 2,
            borderColor: noSeason ? NIGHT.fg : NIGHT.line,
          }}
        />
      </Pressable>
    </IntakeFrame>
  )
}
