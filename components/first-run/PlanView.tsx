import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text as RNText, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import LottieView from 'lottie-react-native'
import {
  HANDOFF_MS,
  NIGHT,
  PLAN_BEATS,
  STORY_PHASES,
  phaseCaption,
  weekDayLine,
  type StoryCategory,
  type WeekStripDay,
} from '../../lib/firstRunStory'
import { getSportAnimation } from '../../lib/sportAnimations'
import { getSportSlug } from '../../lib/intakeUI'
import { selectionFeedback } from '../../lib/haptics'
import type { Phase } from '../../types'
import { Beat, displayWidthEm } from './CategoryStory'
import { BODY, BODY_BOLD, DISPLAY, Label, NightButton } from './Night'
import { StoryPhaseBar } from './StoryPhaseBar'
import { PAGE_EASE } from './intakeMotion'

/** The band's height below the safe area. The Program tab's header matches it. */
export const BAND_BELOW_INSET = 190

export function bandHeight(insetTop: number): number {
  return insetTop + BAND_BELOW_INSET
}

/**
 * The band is a fixed height, so its small text (the chip and the countdown)
 * follows Dynamic Type only this far.
 */
const BAND_TEXT_SCALE = 1.2

/** The band's text stack below the safe area, top to bottom, in points. */
export const BAND_STACK = {
  top: 28,
  chipPadY: 6,
  smallText: 12,
  gap: 6,
  /** Two lines of the 50pt title, plus its 6pt top padding. */
  titleBox: 2 * Math.round(50 * 0.92) + 6,
  countdownGap: 8,
}

/**
 * How tall the stack is at a text scale. Plus Jakarta Sans sets a line at
 * about 1.26 em, and only the chip and countdown follow Dynamic Type.
 */
export function bandStackHeight(fontScale: number): number {
  const small = BAND_STACK.smallText * 1.26 * Math.min(fontScale, BAND_TEXT_SCALE)
  const b = BAND_STACK
  return b.top + (small + 2 * b.chipPadY) + b.gap + b.titleBox + b.countdownGap + small
}

/** The band title's largest size; its box always holds two lines at this size. */
const BAND_TITLE_MAX = 50
const bandLine = (size: number) => Math.round(size * 0.92)

/** The lines `text` wraps to at `size` in `maxWidth`, breaking at spaces as Text does. */
export function wrapLines(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1]
    if (last !== undefined && displayWidthEm(`${last} ${word}`) * size * 1.04 <= maxWidth) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

/**
 * "BASKETBALL PLAN" at 50pt. A long name like "TRACK (SPRINTS/JUMPS) PLAN"
 * steps down until it wraps to two lines with every line fitting, measured
 * with Bebas Neue's own letter widths. (Web has no adjustsFontSizeToFit, so
 * this has to be right on its own.)
 */
export function bandTitleSize(sportName: string, maxWidth = 230): number {
  const title = `${sportName} PLAN`.toUpperCase()
  for (let size = BAND_TITLE_MAX; size > 16; size--) {
    const lines = wrapLines(title, size, maxWidth)
    if (lines.length <= 2 && lines.every((l) => displayWidthEm(l) * size * 1.04 <= maxWidth)) return size
  }
  return 16
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * One size for every label in the week strip (LOWER, UPPER, RECOVER…), set
 * by the widest so they all match: up to 19pt, smaller on narrow phones.
 */
export function weekTagSize(week: readonly { tag: string | null }[], screenWidth: number): number {
  const cell = (Math.min(screenWidth, 560) - 48 - 6 * 4) / 7 - 6
  const widest = Math.max(displayWidthEm('LOWER'), ...week.map((d) => (d.tag ? displayWidthEm(d.tag) : 0)))
  return Math.floor(Math.min(19, cell / (widest * 1.06)))
}

/**
 * Room for the longest phase caption, so tapping a phase doesn't move the
 * strip below it at the default text size: three lines, or four on a phone
 * narrower than 360pt.
 */
export function captionMinHeight(screenWidth: number): number {
  return screenWidth < 360 ? 80 : 60
}

/** Icons that are a round ball still read as a ball when the band's edge cuts them. */
const BLEED_ICONS = new Set(['basketball', 'soccer', 'volleyball', 'baseball', 'softball'])

/**
 * Where the band's sport icon sits. A round ball bleeds off the right edge;
 * any other icon (goggles, a racket, a barbell) sits whole inside the band,
 * since half of it reads as a blob.
 */
export function bandIconFrame(sportName: string, insetTop: number): { size: number; right: number; top: number } {
  if (BLEED_ICONS.has(getSportSlug(sportName))) return { size: 190, right: -46, top: insetTop }
  // Ends above the countdown's row (see the band's title box).
  return { size: 128, right: 16, top: insetTop + 20 }
}

/** The sport icon in the band plays a short action (0.8 s) and holds its pose. */
function BandIcon({ name, play, size }: { name: string; play: boolean; size: number }) {
  const ref = useRef<LottieView>(null)
  const source = getSportAnimation(name)
  useEffect(() => {
    if (!play) return
    const t = setTimeout(() => ref.current?.play(0, 36), 0)
    return () => clearTimeout(t)
  }, [play])
  if (!source) return null
  return <LottieView ref={ref} source={source} autoPlay={false} loop={false} speed={1.5} style={{ width: size, height: size }} />
}

/**
 * The reveal's second part: the band (category chip, "BASKETBALL PLAN" and
 * the game-day countdown), the phase bar drawing one phase at a time, the
 * tappable "Your week" strip, the session total set big, and Save my plan.
 *
 * `openFrom` is the lit category tile's frame: the band starts clipped to it
 * and opens to full width, so the tile becomes the band without stretching.
 */
export function PlanView({
  sportName,
  category,
  countdown,
  weeksPerPhase,
  programWeeks,
  sessionCount,
  noSeason,
  week,
  trainingDays,
  animate,
  openFrom,
  onCategory,
  onSave,
  saveBlocked,
  onChangeAnswers,
}: {
  sportName: string
  category: StoryCategory
  countdown: string
  weeksPerPhase: number
  programWeeks: number
  sessionCount: number
  noSeason: boolean
  week: WeekStripDay[]
  trainingDays: readonly number[]
  animate: boolean
  openFrom: Rect | null
  onCategory: () => void
  onSave: () => void
  /** Why Save is off, e.g. the workouts aren't on the server yet. */
  saveBlocked?: string | null
  /** Back to the questions, to fix an answer before saving. */
  onChangeAnswers: () => void
}) {
  const insets = useSafeAreaInsets()
  const { width: W } = useWindowDimensions()
  const H = bandHeight(insets.top)
  const icon = bandIconFrame(sportName, insets.top)
  // Clear of the icon, so the title never runs under it.
  const titleMax = Math.min(240, W - 24 - icon.size - icon.right - 4)
  const titleSize = bandTitleSize(sportName, titleMax)
  const delay = openFrom ? 550 : 0
  const now = new Date()
  const [phase, setPhase] = useState<Phase>('GPP')
  const firstDay = week.find((d) => d.programDay === 1) ?? week[0]
  const [dow, setDow] = useState(firstDay.dow)
  const day = week.find((d) => d.dow === dow) ?? firstDay
  const tagSize = weekTagSize(week, W)

  // ── The handoff clip ──
  const open = useSharedValue(openFrom ? 0 : 1)
  const textIn = useSharedValue(openFrom ? 0 : 1)
  const tagOut = useSharedValue(openFrom ? 1 : 0)
  useEffect(() => {
    if (!openFrom) return
    open.value = withTiming(1, { duration: HANDOFF_MS, easing: PAGE_EASE })
    textIn.value = withDelay(300, withTiming(1, { duration: 260 }))
    tagOut.value = withDelay(300, withTiming(0, { duration: 220 }))
    // The frame is captured once, when the handoff starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const from = openFrom ?? { x: 0, y: 0, width: W, height: H }
  const clipStyle = useAnimatedStyle(() => {
    const k = open.value
    return {
      left: from.x * (1 - k),
      top: from.y * (1 - k),
      width: from.width + (W - from.width) * k,
      height: from.height + (H - from.height) * k,
      borderRadius: 16 * (1 - k),
    }
  })
  const innerStyle = useAnimatedStyle(() => {
    const k = open.value
    return { transform: [{ translateX: -from.x * (1 - k) }, { translateY: -from.y * (1 - k) }] }
  })
  const textStyle = useAnimatedStyle(() => ({ opacity: textIn.value }))
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOut.value }))

  // The total lands with a haptic.
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(selectionFeedback, delay + PLAN_BEATS.total)
    return () => clearTimeout(t)
  }, [animate, delay])

  return (
    <View style={{ flex: 1 }} testID="reveal-plan">
      {/* The band. Inside a clip that opens from the lit tile. */}
      <View style={{ height: H }}>
        <Animated.View style={[{ position: 'absolute', overflow: 'hidden' }, clipStyle]}>
          <Animated.View style={[{ width: W, height: H, backgroundColor: category.color }, innerStyle]}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', right: icon.right, top: icon.top, width: icon.size, height: icon.size }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <BandIcon name={sportName} play={animate} size={icon.size} />
            </View>
            <Animated.View style={[{ paddingTop: insets.top + BAND_STACK.top, paddingHorizontal: 24 }, textStyle]}>
              <Pressable
                onPress={onCategory}
                accessibilityRole="button"
                accessibilityLabel={`${category.name}. See your category again`}
                testID="reveal-category-chip"
                hitSlop={10}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  paddingVertical: BAND_STACK.chipPadY,
                  paddingHorizontal: 12,
                }}
              >
                <RNText style={{ fontFamily: BODY_BOLD, fontSize: BAND_STACK.smallText, letterSpacing: 1.6, color: '#FFFFFF' }} maxFontSizeMultiplier={BAND_TEXT_SCALE}>
                  {`${category.name.toUpperCase()} ›`}
                </RNText>
              </Pressable>
              {/* Always two lines tall, so the countdown sits on the same row
                  for every sport, below where an inside icon ends. */}
              <View style={{ height: BAND_STACK.titleBox, marginTop: BAND_STACK.gap }}>
                <RNText
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: titleSize,
                    lineHeight: bandLine(titleSize),
                    paddingTop: 6,
                    color: '#FFFFFF',
                    maxWidth: titleMax,
                  }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1}
                  accessibilityRole="header"
                  testID="reveal-title"
                >
                  {`${sportName.toUpperCase()} PLAN`}
                </RNText>
              </View>
              {/* One line, shrinking to fit, so it never wraps out of the band. */}
              <RNText
                style={{ fontFamily: BODY_BOLD, fontSize: BAND_STACK.smallText, letterSpacing: 1.4, color: '#FFFFFF', opacity: 0.9, marginTop: BAND_STACK.countdownGap }}
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={BAND_TEXT_SCALE}
                testID="reveal-countdown"
              >
                {countdown.toUpperCase()}
              </RNText>
            </Animated.View>
            {openFrom ? (
              // The tile's name stays until the band's own text takes over.
              <Animated.Text
                style={[
                  {
                    position: 'absolute',
                    left: from.x + 14,
                    top: from.y + from.height - 42,
                    fontFamily: DISPLAY,
                    fontSize: 30,
                    lineHeight: 30,
                    color: '#FFFFFF',
                  },
                  tagStyle,
                ]}
              >
                {category.name.toUpperCase()}
              </Animated.Text>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 16 }}>
          <StoryPhaseBar
            weeksPerPhase={weeksPerPhase}
            selected={phase}
            onSelect={(p) => {
              selectionFeedback()
              setPhase(p)
            }}
            draw={animate}
            drawAt={delay + PLAN_BEATS.phases}
            drawGap={PLAN_BEATS.phaseGap}
          />
        </View>
        <Beat at={delay + PLAN_BEATS.phases} play={animate}>
          <RNText
            style={{ fontFamily: BODY, fontSize: 14, lineHeight: 20, color: NIGHT.fg, minHeight: captionMinHeight(W), marginTop: 8 }}
            accessibilityLiveRegion="polite"
            testID="phase-caption"
          >
            <RNText style={{ fontFamily: BODY_BOLD }}>
              {`${STORY_PHASES.find((p) => p.phase === phase)?.label} · ${weeksPerPhase} ${weeksPerPhase === 1 ? 'week' : 'weeks'}. `}
            </RNText>
            {phaseCaption(phase, sportName, category, noSeason)}
          </RNText>
        </Beat>

        <Beat at={delay + PLAN_BEATS.week} play={animate} style={{ marginTop: 8 }}>
          <Label style={{ marginBottom: 8 }}>Your week · tap a day</Label>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {week.map((d) => {
              const on = d.dow === dow
              return (
                <Pressable
                  key={d.dow}
                  onPress={() => {
                    selectionFeedback()
                    setDow(d.dow)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={weekDayLine(d, trainingDays, now)}
                  testID={`week-${d.short}`}
                  style={{
                    flex: 1,
                    height: 60,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    backgroundColor: on ? category.color : NIGHT.ink2,
                  }}
                >
                  <RNText style={{ fontFamily: BODY_BOLD, fontSize: 12, color: on ? '#FFFFFF' : NIGHT.fg2 }}>{d.short.slice(0, 1)}</RNText>
                  <RNText
                    numberOfLines={1}
                    maxFontSizeMultiplier={1}
                    style={{ fontFamily: DISPLAY, fontSize: tagSize, lineHeight: tagSize + 1, color: on ? '#FFFFFF' : d.tag ? NIGHT.fg : NIGHT.line }}
                  >
                    {d.tag ?? '—'}
                  </RNText>
                </Pressable>
              )
            })}
          </View>
          <RNText style={{ fontFamily: BODY, fontSize: 14, color: NIGHT.fg2, marginTop: 8 }} testID="week-day-line" accessibilityLiveRegion="polite">
            {weekDayLine(day, trainingDays, now)}
          </RNText>
        </Beat>

        <Beat at={delay + PLAN_BEATS.total} play={animate} style={{ marginTop: 28 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}
            accessible
            accessibilityLabel={`${sessionCount} sessions over ${programWeeks} weeks`}
            testID="reveal-sessions"
          >
            <RNText style={{ fontFamily: DISPLAY, fontSize: 112, lineHeight: 96, paddingTop: 14, color: NIGHT.fg, fontVariant: ['tabular-nums'] }}>
              {String(sessionCount)}
            </RNText>
            <RNText style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 26, color: NIGHT.fg2, paddingBottom: 8, letterSpacing: 1 }}>
              {`SESSIONS\nOVER ${programWeeks} WEEKS`}
            </RNText>
          </View>
        </Beat>

        {/* Save holds the bottom; the plan reads top to bottom with no gap in it. */}
        <Beat at={delay + PLAN_BEATS.save} play={animate} style={{ marginTop: 'auto', paddingTop: 24 }}>
          {saveBlocked ? (
            <RNText
              style={{ fontFamily: BODY, fontSize: 14, color: NIGHT.fg2, marginBottom: 8 }}
              accessibilityLiveRegion="polite"
              testID="reveal-save-blocked"
            >
              {saveBlocked}
            </RNText>
          ) : null}
          <NightButton label="Save my plan" onPress={onSave} disabled={!!saveBlocked} testID="first-run-save" />
          <Pressable
            onPress={onChangeAnswers}
            accessibilityRole="button"
            testID="reveal-change-answers"
            style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 12 }}
          >
            <RNText style={{ fontFamily: BODY_BOLD, fontSize: 14, color: NIGHT.link }}>Change my answers</RNText>
          </Pressable>
        </Beat>
      </ScrollView>
    </View>
  )
}
