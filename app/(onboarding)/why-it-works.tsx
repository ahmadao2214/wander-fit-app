import { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, Button, ScrollView, Circle } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Vibration, Animated } from 'react-native'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'
import { PHASE_DATA } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { ChevronRight, ChevronLeft, ChevronDown, Dumbbell, Target, Trophy } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'

// Phase detail content for accordion
const PHASE_DETAILS: Record<Phase, { icon: React.ElementType; bullets: string[]; color: string; bgColor: string }> = {
  GPP: {
    icon: Dumbbell,
    color: '$blue11',
    bgColor: '$blue3',
    bullets: [
      'Build overall strength and conditioning',
      'Develop movement quality and coordination',
      'Create a strong aerobic base',
    ],
  },
  SPP: {
    icon: Target,
    color: '$orange11',
    bgColor: '$orange3',
    bullets: [
      'Transition general fitness to sport demands',
      'Increase training intensity progressively',
      'Refine sport-specific movement patterns',
    ],
  },
  SSP: {
    icon: Trophy,
    color: '$green11',
    bgColor: '$green3',
    bullets: [
      'Peak performance for competition',
      'Sport-specific power and speed',
      'Mental and physical readiness',
    ],
  },
}

/**
 * Screen 2 (Combined Flow): Training Overview
 *
 * Consolidated screen combining "Science-Backed Training" and "Three Chapters"
 * Shows why periodization works + the GPP→SPP→SSP phases in one clean view.
 *
 * Also used in revisit mode for educational content review.
 */
export default function TrainingOverviewScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()

  // Accordion state - track which phases are expanded
  const [expandedPhases, setExpandedPhases] = useState<Set<Phase>>(new Set())

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  // Analytics tracking - must be called before any conditional returns
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.WHY_IT_WORKS,
    screenName: ONBOARDING_SCREEN_NAMES[2],
    isRevisit,
  })

  // Swipe navigation - only backward (right swipe), forward requires Continue button
  const { panHandlers, translateX } = useSwipeNavigation({
    onSwipeRight: !isRevisit ? () => router.back() : undefined,
    canSwipeRight: !isRevisit,
    canSwipeLeft: false,
  })

  const togglePhase = (phase: Phase) => {
    Vibration.vibrate(10)
    setExpandedPhases((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(phase)) {
        newSet.delete(phase)
      } else {
        newSet.add(phase)
      }
      return newSet
    })
  }

  // Loading state - only undefined means loading, null means no user data
  // Wrap in Animated.View for consistent layout with swipe navigation
  if (onboardingState === undefined) {
    return (
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <YStack flex={1} bg="$background" items="center" justify="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </Animated.View>
    )
  }

  const handleBack = () => {
    if (isRevisit) {
      router.replace('/(athlete)')
    } else {
      router.back()
    }
  }

  const handleContinue = () => {
    trackScreenComplete()
    // Skip phases-overview and go directly to age-group
    router.push({
      pathname: '/(intake)/age-group',
      params: { sportId },
    } as any)
  }

  const handleDone = async () => {
    await completeOnboarding()
    router.replace('/(athlete)')
  }

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId },
      } as any)
    }
  }

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']

  return (
    <Animated.View
      {...panHandlers}
      style={{ flex: 1, transform: [{ translateX }] }}
    >
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <YStack
          px="$4"
          pt={insets.top + 16}
          pb="$4"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots - only show in normal flow */}
          {!isRevisit && (
            <YStack items="center" mb="$4">
              <IntakeProgressDots
                total={COMBINED_FLOW_SCREEN_COUNT}
                current={COMBINED_FLOW_SCREENS.WHY_IT_WORKS}
                onNavigate={handleProgressNavigate}
              />
            </YStack>
          )}

          {/* Revisit Mode Header */}
          {isRevisit && (
            <YStack items="center" mb="$2">
              <Text fontSize="$2" color="$color10" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                Training Education
              </Text>
            </YStack>
          )}

          {/* Header */}
          <YStack items="center" gap="$1" mb="$4">
            <Text fontSize="$7" fontWeight="bold" color="$color12" text="center">
              Science-Backed
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$primary" text="center">
              Training in 3 Phases
            </Text>
          </YStack>

          {/* Subtitle */}
          <Text fontSize="$3" color="$color10" text="center" mb="$5" lineHeight={22}>
            Progressive periodization adapts your training{'\n'}to peak at the right time
          </Text>

          {/* Timeline visualization */}
          <XStack justify="center" items="center" gap="$2" mb="$5">
            {phases.map((phase, index) => {
              const details = PHASE_DETAILS[phase]
              return (
                <XStack key={phase} items="center">
                  <Circle
                    size={44}
                    bg={details.bgColor as any}
                    borderWidth={2}
                    borderColor={details.color as any}
                  >
                    <Text
                      fontSize="$3"
                      fontWeight="bold"
                      color={details.color as any}
                    >
                      {index + 1}
                    </Text>
                  </Circle>
                  {index < phases.length - 1 && (
                    <Text color="$color8" fontSize="$4" px="$2">→</Text>
                  )}
                </XStack>
              )
            })}
          </XStack>

          {/* Phase cards - expandable accordion */}
          <YStack gap="$3">
            {phases.map((phase, index) => {
              const isExpanded = expandedPhases.has(phase)
              const details = PHASE_DETAILS[phase]
              const Icon = details.icon

              return (
                <YStack
                  key={phase}
                  bg={details.bgColor as any}
                  rounded="$4"
                  borderWidth={2}
                  borderColor={details.color as any}
                  overflow="hidden"
                >
                  {/* Header - always visible, tappable */}
                  <XStack
                    p="$4"
                    items="center"
                    gap="$3"
                    onPress={() => togglePhase(phase)}
                    cursor="pointer"
                    pressStyle={{ opacity: 0.8 }}
                  >
                    <Circle size={40} bg={details.color as any}>
                      <Icon size={20} color="white" />
                    </Circle>

                    <YStack flex={1}>
                      <XStack items="center" gap="$2">
                        <Text
                          fontSize="$2"
                          color={details.color as any}
                          fontWeight="600"
                          textTransform="uppercase"
                          letterSpacing={0.5}
                        >
                          {PHASE_DATA[phase].duration}
                        </Text>
                        {index === 0 && (
                          <YStack bg={details.color as any} px="$2" py="$0.5" rounded="$2">
                            <Text fontSize={10} color="white" fontWeight="700">
                              START
                            </Text>
                          </YStack>
                        )}
                      </XStack>
                      <Text fontSize="$4" fontWeight="bold" color="$color12">
                        {PHASE_DATA[phase].tagline}
                      </Text>
                    </YStack>

                    {/* Expand/collapse indicator */}
                    <YStack
                      animation="quick"
                      rotate={isExpanded ? '180deg' : '0deg'}
                    >
                      <ChevronDown size={20} color={details.color as any} />
                    </YStack>
                  </XStack>

                  {/* Expanded content */}
                  {isExpanded && (
                    <YStack
                      px="$4"
                      pb="$4"
                      gap="$2"
                      animation="quick"
                      enterStyle={{ opacity: 0, y: -10 }}
                    >
                      <Text fontSize="$2" color="$color11" fontWeight="600" mb="$1">
                        {PHASE_DATA[phase].name}
                      </Text>
                      {details.bullets.map((bullet, i) => (
                        <XStack key={i} gap="$2" items="flex-start">
                          <Circle size={6} bg={details.color as any} mt={7} />
                          <Text fontSize="$3" color="$color11" flex={1} lineHeight={20}>
                            {bullet}
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  )}
                </YStack>
              )
            })}
          </YStack>

          {/* Tap hint */}
          <Text fontSize="$2" color="$color9" text="center" mt="$3">
            Tap each phase to learn more
          </Text>
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        {isRevisit ? (
          <Button
            size="$5"
            bg="$primary"
            color="white"
            onPress={handleDone}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Done
          </Button>
        ) : (
          <XStack gap="$3">
            <Button
              flex={1}
              size="$5"
              bg="$color4"
              color="$color11"
              onPress={handleBack}
              icon={ChevronLeft}
              fontFamily="$body"
              fontWeight="600"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Back
            </Button>
            <Button
              flex={2}
              size="$5"
              bg="$primary"
              color="white"
              onPress={handleContinue}
              iconAfter={ChevronRight}
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Continue
            </Button>
          </XStack>
        )}
      </YStack>
    </YStack>
    </Animated.View>
  )
}

