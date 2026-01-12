import { useEffect, useRef } from 'react'
import { YStack, XStack, H1, H2, Text, Card, Button, Spinner } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Animated, Easing } from 'react-native'
import {
  Trophy,
  Star,
  ChevronRight,
  Target,
  Calendar,
  TrendingUp,
  PartyPopper,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

/**
 * Celebration Screen
 *
 * First screen of reassessment flow.
 * Celebrates the user's completion of a training phase.
 * Shows stats from the completed phase and invites them to check in.
 */
export default function CelebrationScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Get reassessment status
  const reassessmentStatus = useQuery(api.userPrograms.getReassessmentStatus)

  // Animation for the trophy
  const scaleAnim = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Bounce in animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 400,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start()

    // Subtle rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  const handleContinue = () => {
    router.push('/(reassessment)/self-assessment')
  }

  // Loading state
  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  // Should not happen if guard is working, but handle gracefully
  if (!reassessmentStatus?.reassessmentPending) {
    router.replace('/(athlete)')
    return null
  }

  const { completedPhase, nextPhase, isFullCycleComplete, completionStats } = reassessmentStatus
  const phaseName = PHASE_NAMES[completedPhase as keyof typeof PHASE_NAMES] ?? 'Phase'
  const nextPhaseName = PHASE_NAMES[nextPhase as keyof typeof PHASE_NAMES] ?? 'Next Phase'

  // Safe access to completionStats with defaults
  const statsCompleted = completionStats?.completed ?? 0
  const statsRate = completionStats?.rate ?? 0

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  })

  return (
    <YStack flex={1} bg="$background">
      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 40}
        pb="$4"
        items="center"
        justify="center"
        gap="$6"
        maxW={600}
        width="100%"
        self="center"
      >
        {/* Animated Trophy */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }, { rotate }],
          }}
        >
          <YStack
            width={140}
            height={140}
            rounded="$10"
            bg="$brand2"
            items="center"
            justify="center"
            borderWidth={3}
            borderColor="$primary"
          >
            <Trophy size={72} color="$primary" />
          </YStack>
        </Animated.View>

        {/* Celebration Text */}
        <YStack gap="$3" items="center">
          <XStack items="center" gap="$2">
            <PartyPopper size={28} color="$accent" />
            <Text fontSize={18} fontWeight="600" color="$accent">
              CONGRATULATIONS!
            </Text>
            <PartyPopper size={28} color="$accent" />
          </XStack>

          <H1 text="center" fontSize={32} color="$color12">
            {phaseName} Complete!
          </H1>

          <Text
            text="center"
            fontSize={16}
            color="$color11"
            maxW={320}
            lineHeight={24}
          >
            {isFullCycleComplete
              ? "You've completed the full 12-week training cycle! Time to start fresh with new goals."
              : `You've built a strong foundation. Let's check in before moving to ${nextPhaseName}.`}
          </Text>
        </YStack>

        {/* Stats Card */}
        <Card
          width="100%"
          p="$5"
          bg="$surface"
          borderWidth={1}
          borderColor="$borderColor"
          rounded="$4"
        >
          <YStack gap="$4">
            <XStack items="center" gap="$2">
              <Star size={20} color="$primary" />
              <Text fontSize={14} fontWeight="600" color="$color12">
                PHASE STATS
              </Text>
            </XStack>

            <XStack justify="space-between">
              {/* Workouts Completed */}
              <YStack items="center" gap="$1" flex={1}>
                <YStack
                  width={48}
                  height={48}
                  rounded="$10"
                  bg="$brand2"
                  items="center"
                  justify="center"
                >
                  <Target size={24} color="$primary" />
                </YStack>
                <Text fontSize={24} fontWeight="700" color="$color12">
                  {statsCompleted}
                </Text>
                <Text fontSize={12} color="$color10" text="center">
                  Workouts{'\n'}Completed
                </Text>
              </YStack>

              {/* Completion Rate */}
              <YStack items="center" gap="$1" flex={1}>
                <YStack
                  width={48}
                  height={48}
                  rounded="$10"
                  bg="$green3"
                  items="center"
                  justify="center"
                >
                  <TrendingUp size={24} color="$green10" />
                </YStack>
                <Text fontSize={24} fontWeight="700" color="$color12">
                  {statsRate}%
                </Text>
                <Text fontSize={12} color="$color10" text="center">
                  Completion{'\n'}Rate
                </Text>
              </YStack>

              {/* Weeks */}
              <YStack items="center" gap="$1" flex={1}>
                <YStack
                  width={48}
                  height={48}
                  rounded="$10"
                  bg="$blue3"
                  items="center"
                  justify="center"
                >
                  <Calendar size={24} color="$blue10" />
                </YStack>
                <Text fontSize={24} fontWeight="700" color="$color12">
                  4
                </Text>
                <Text fontSize={12} color="$color10" text="center">
                  Weeks{'\n'}Trained
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>

        {/* What's Next Card */}
        <Card
          width="100%"
          p="$4"
          bg="$brand1"
          borderWidth={0}
          rounded="$4"
        >
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$primary">
              WHAT'S NEXT
            </Text>
            <Text fontSize={15} color="$color12" lineHeight={22}>
              We'll ask a few quick questions to optimize your next phase. This helps us
              adjust your training intensity and potentially upgrade your skill level.
            </Text>
          </YStack>
        </Card>
      </YStack>

      {/* Bottom CTA */}
      <YStack
        px="$4"
        pt="$4"
        pb={16 + insets.bottom}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$background"
      >
        <Button
          size="$5"
          bg="$primary"
          color="white"
          onPress={handleContinue}
          fontWeight="700"
        >
          <XStack items="center" gap="$2">
            <Text color="white" fontWeight="700" fontSize={16}>
              Continue to Check-In
            </Text>
            <ChevronRight size={20} color="white" />
          </XStack>
        </Button>
      </YStack>
    </YStack>
  )
}
