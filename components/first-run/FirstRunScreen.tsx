import React from 'react'
import { Platform, KeyboardAvoidingView, ScrollView } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Text, XStack, YStack } from 'tamagui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { FIRST_RUN_STEPS, type FirstRunStep } from '../../lib/firstRunDraft'
import { STEP_ROUTES } from '../../lib/firstRunRoutes'

/**
 * The five questions and the screen each is on. "About you" asks two (age
 * group and years training), so the progress bar fills two segments there.
 */
export const QUESTIONS: readonly FirstRunStep[] = ['sport', 'season', 'days', 'about', 'about']

/** 1-based question numbers a step covers, e.g. about → [4, 5]. */
export function questionsOn(step: FirstRunStep): number[] {
  return QUESTIONS.flatMap((s, i) => (s === step ? [i + 1] : []))
}

interface FirstRunScreenProps {
  step: FirstRunStep
  title: string
  subtitle?: string
  /** Sits between the header and the content, e.g. the "Your program" bar. */
  above?: React.ReactNode
  children: React.ReactNode
  primaryLabel: string
  onPrimary: () => void
  primaryDisabled?: boolean
  primaryTestID?: string
  /** Shown under the primary button as a quiet text link. */
  secondary?: React.ReactNode
  /** The content scrolls by default; a screen with its own list turns this off. */
  scroll?: boolean
  /** Centers a short screen's content vertically instead of top-aligning it. */
  centered?: boolean
}

function previousStep(step: FirstRunStep): FirstRunStep | null {
  const index = FIRST_RUN_STEPS.indexOf(step)
  return index > 0 ? FIRST_RUN_STEPS[index - 1] : null
}

/**
 * The frame every First Run screen shares: back, a truthful "N of 4" count,
 * a title in the body face, the content, and one primary action pinned
 * above the home indicator.
 */
export function FirstRunScreen({
  step,
  title,
  subtitle,
  above,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryTestID,
  secondary,
  scroll = true,
  centered = false,
}: FirstRunScreenProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const back = previousStep(step)
  const onThisStep = questionsOn(step)
  const answeredThrough = onThisStep.length ? onThisStep[onThisStep.length - 1] : 0

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else if (back) router.replace(STEP_ROUTES[back] as Href)
  }

  const body = (
    <YStack
      gap="$5"
      px="$5"
      pb="$5"
      width="100%"
      maxW={560}
      self="center"
      flex={centered ? 1 : undefined}
      justify={centered ? 'center' : undefined}
    >
      <YStack gap="$2">
        <Text
          fontFamily="$body"
          fontWeight="700"
          fontSize={28}
          lineHeight={34}
          color="$color12"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text fontFamily="$body" fontSize={16} lineHeight={24} color="$color11">
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {children}
    </YStack>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      enabled={Platform.OS === 'ios'}
    >
      <YStack flex={1} bg="$background">
        <XStack pt={insets.top + 8} px="$3" height={insets.top + 52} items="center" justify="space-between">
          {back ? (
            <Button
              chromeless
              size="$4"
              circular
              icon={<ChevronLeft size={24} color="$color12" />}
              onPress={goBack}
              accessibilityLabel="Back"
              testID="first-run-back"
            />
          ) : (
            <YStack width={44} />
          )}
          {answeredThrough > 0 ? (
            <XStack
              gap="$1.5"
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Question ${onThisStep.join(' and ')} of ${QUESTIONS.length}`}
              testID="first-run-progress"
            >
              {QUESTIONS.map((_, i) => (
                <YStack
                  key={i}
                  width={24}
                  height={4}
                  rounded="$10"
                  bg={i < answeredThrough ? '$primary' : '$color5'}
                />
              ))}
            </XStack>
          ) : null}
          <YStack width={44} />
        </XStack>

        {above ? <YStack px="$5" pb="$3" width="100%" maxW={560} self="center">{above}</YStack> : null}

        {scroll ? (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {body}
          </ScrollView>
        ) : (
          <YStack flex={1}>{body}</YStack>
        )}

        <YStack
          px="$5"
          pt="$3"
          pb={insets.bottom + 16}
          gap="$3"
          width="100%"
          maxW={560}
          self="center"
        >
          <Button
            size="$5"
            bg={primaryDisabled ? '$color5' : '$primary'}
            color={primaryDisabled ? '$color10' : 'white'}
            disabled={primaryDisabled}
            onPress={onPrimary}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={primaryDisabled ? undefined : { bg: '$primaryPress', scale: 0.98 }}
            hoverStyle={primaryDisabled ? undefined : { bg: '$primaryHover' }}
            accessibilityState={{ disabled: primaryDisabled }}
            testID={primaryTestID}
          >
            {primaryLabel}
          </Button>
          {secondary}
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  )
}
