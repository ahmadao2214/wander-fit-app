import React from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as RNText, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { FIRST_RUN_STEPS, type FirstRunStep } from '../../lib/firstRunDraft'
import { STEP_ROUTES } from '../../lib/firstRunRoutes'
import { NIGHT } from '../../lib/firstRunStory'
import { DISPLAY, NightButton, SportBackdrop } from './Night'

/** Question screens and their place in the "n/5" count. The fifth is the plan. */
export const QUESTION_STEPS: readonly FirstRunStep[] = ['sport', 'season', 'days', 'about']
export const PROGRESS_TOTAL = 5

export function questionNumber(step: FirstRunStep): number {
  return QUESTION_STEPS.indexOf(step) + 1
}

function previousStep(step: FirstRunStep): FirstRunStep | null {
  const index = FIRST_RUN_STEPS.indexOf(step)
  return index > 0 ? FIRST_RUN_STEPS[index - 1] : null
}

interface IntakeFrameProps {
  step: FirstRunStep
  /** The world's ground: game-night navy, or tinted by the category. */
  ground: string
  /** The picked sport, drawn large in the corner behind the page. */
  backdrop?: { name: string; fly?: boolean } | null
  moving: boolean
  children: React.ReactNode
  /** Pinned above the home indicator. */
  primary?: { label: string; onPress: () => void; disabled?: boolean; testID?: string } | null
  secondary?: React.ReactNode
  /** Shows the back button and the progress count. */
  showTop?: boolean
  /** The content scrolls by default; a screen with its own list turns this off. */
  scroll?: boolean
  /** Rendered behind the page, under the backdrop. */
  behind?: React.ReactNode
}

/**
 * The frame every First Run screen shares: game night's ground, the sport
 * backdrop, back plus an "n/5" progress bar, the content, and one primary
 * action above the home indicator.
 */
export function IntakeFrame({
  step,
  ground,
  backdrop,
  moving,
  children,
  primary,
  secondary,
  showTop = true,
  scroll = true,
  behind,
}: IntakeFrameProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const back = previousStep(step)
  const n = questionNumber(step)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else if (back) router.replace(STEP_ROUTES[back] as Href)
  }

  const body = (
    <View style={{ flexGrow: 1, paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' }}>{children}</View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: ground, overflow: 'hidden' }}>
      {behind}
      {backdrop ? <SportBackdrop name={backdrop.name} fly={backdrop.fly} moving={moving} /> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        enabled={Platform.OS === 'ios'}
      >
        <View style={{ paddingTop: insets.top + 8 }}>
          {showTop ? (
            <View
              style={{
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                width: '100%',
                maxWidth: 560,
                alignSelf: 'center',
              }}
            >
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
                testID="first-run-back"
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={24} color={NIGHT.fg} />
              </Pressable>
              <View
                style={{ flex: 1, flexDirection: 'row', gap: 4 }}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Question ${n} of ${PROGRESS_TOTAL}`}
                testID="first-run-progress"
              >
                {Array.from({ length: PROGRESS_TOTAL }, (_, i) => (
                  <View
                    key={i}
                    style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < n ? NIGHT.fg : NIGHT.line }}
                  />
                ))}
              </View>
              <RNText
                style={{ fontFamily: DISPLAY, fontSize: 18, color: NIGHT.fg2, minWidth: 36, textAlign: 'right' }}
                accessible={false}
              >
                {`${n}/${PROGRESS_TOTAL}`}
              </RNText>
            </View>
          ) : null}
        </View>

        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: primary || secondary ? 16 : insets.bottom + 16 }}
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 16, paddingBottom: primary || secondary ? 0 : insets.bottom + 16 }}>{body}</View>
        )}

        {primary || secondary ? (
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              gap: 12,
              width: '100%',
              maxWidth: 560,
              alignSelf: 'center',
            }}
          >
            {primary ? (
              <NightButton
                label={primary.label}
                onPress={primary.onPress}
                disabled={primary.disabled}
                testID={primary.testID}
              />
            ) : null}
            {secondary}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  )
}
