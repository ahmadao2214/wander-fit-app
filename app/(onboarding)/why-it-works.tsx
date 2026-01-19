import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, Button, ScrollView } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { ChevronRight, ChevronLeft } from '@tamagui/lucide-icons'

/**
 * Screen 2 (Combined Flow): Why This Works
 *
 * Social proof and education about periodization training.
 * Explains why the GPP→SPP→SSP model is effective.
 *
 * Also used in revisit mode as the second educational screen.
 */
export default function WhyItWorksScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.WHY_IT_WORKS,
    screenName: ONBOARDING_SCREEN_NAMES[2],
    isRevisit,
  })

  // Loading state
  if (onboardingState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    trackScreenComplete()
    router.push({
      pathname: '/(onboarding)/phases-overview',
      params: { sportId },
    } as any)
  }

  const handleDone = async () => {
    // Mark onboarding as complete and return to dashboard
    await completeOnboarding()
    router.replace('/(athlete)')
  }

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <ScrollView flex={1}>
        <YStack
          px="$4"
          pt={insets.top + 16}
          pb="$4"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots - only show in normal flow, not revisit */}
          {!isRevisit && (
            <YStack items="center" mb="$4">
              <IntakeProgressDots total={COMBINED_FLOW_SCREEN_COUNT} current={COMBINED_FLOW_SCREENS.WHY_IT_WORKS} />
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
          <YStack items="center" gap="$2" mb="$6">
            <Text fontSize="$8" fontWeight="bold" color="$color12" text="center">
              Science-Backed
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$primary" text="center">
              Training
            </Text>
          </YStack>

          {/* Main content */}
          <YStack gap="$6">
            {/* Explanation */}
            <YStack bg="$color3" rounded="$4" p="$5" gap="$3">
              <Text fontSize="$5" color="$color12" fontWeight="600">
                What is Periodization?
              </Text>
              <Text fontSize="$3" color="$color11" lineHeight={22}>
                Periodization is the systematic planning of athletic training.
                It involves progressive cycling of various aspects of a training
                program during a specific period.
              </Text>
              <Text fontSize="$3" color="$color11" lineHeight={22}>
                This approach is used by Olympic athletes, professional sports
                teams, and anyone who wants to maximize their performance while
                minimizing injury risk.
              </Text>
            </YStack>

            {/* Stats/proof points */}
            <XStack gap="$4" justify="center">
              <StatCard
                value="12"
                label="Weeks"
                sublabel="Full Program"
              />
              <StatCard
                value="3"
                label="Phases"
                sublabel="Progressive"
              />
              <StatCard
                value="100%"
                label="Tailored"
                sublabel="To Your Sport"
              />
            </XStack>

            {/* Endorsement */}
            <YStack items="center" gap="$2" py="$4">
              <Text fontSize="$3" color="$color10" text="center">
                Used by elite athletes and coaches worldwide
              </Text>
            </YStack>
          </YStack>
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
              onPress={handleDone}
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Done
            </Button>
          </XStack>
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
  )
}

interface StatCardProps {
  value: string
  label: string
  sublabel: string
}

function StatCard({ value, label, sublabel }: StatCardProps) {
  return (
    <YStack
      flex={1}
      bg="$color3"
      rounded="$4"
      p="$3"
      items="center"
      gap="$1"
      borderWidth={1}
      borderColor="$color6"
    >
      <Text fontSize="$7" fontWeight="bold" color="$primary">
        {value}
      </Text>
      <Text fontSize="$3" fontWeight="600" color="$color12">
        {label}
      </Text>
      <Text fontSize="$2" color="$color10">
        {sublabel}
      </Text>
    </YStack>
  )
}
