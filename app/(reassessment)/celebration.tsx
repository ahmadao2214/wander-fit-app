import { useEffect } from 'react'
import { YStack, XStack, Text, Button, Card, Spinner } from 'tamagui'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Trophy, Dumbbell, Calendar, TrendingUp } from '@tamagui/lucide-icons'
import { ConfettiEffect } from '../../components/workout/ConfettiEffect'
import Animated, { FadeInUp, BounceIn } from 'react-native-reanimated'

/**
 * Celebration Screen — Screen 1 of Reassessment Flow
 *
 * Shows phase completion congrats with stats.
 * Redirects to dashboard if no pending reassessment.
 */
export default function CelebrationScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : 'skip'
  )

  // Redirect if no pending reassessment
  useEffect(() => {
    if (reassessmentStatus && !reassessmentStatus.reassessmentPending) {
      router.replace('/(athlete)' as any)
    }
  }, [reassessmentStatus, router])

  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text fontFamily="$body" color="$color10">Loading...</Text>
      </YStack>
    )
  }

  if (!reassessmentStatus?.reassessmentPending) {
    return null
  }

  const stats = reassessmentStatus.completionStats
  const completionPercent = stats ? Math.round(stats.completionRate * 100) : 0

  return (
    <YStack flex={1} bg="$background">
      <ConfettiEffect trigger />

      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 24}
        pb={insets.bottom + 24}
        items="center"
        justify="center"
        gap="$6"
        maxW={600}
        width="100%"
        self="center"
      >
        {/* Trophy Icon */}
        <Animated.View entering={BounceIn.delay(200)}>
          <YStack
            width={100}
            height={100}
            bg="$success"
            rounded="$10"
            items="center"
            justify="center"
          >
            <Trophy size={52} color="white" />
          </YStack>
        </Animated.View>

        {/* Heading */}
        <Animated.View entering={FadeInUp.delay(400).duration(300)}>
          <YStack items="center" gap="$2">
            <Text
              fontFamily="$heading"
              fontSize={36}
              letterSpacing={1}
              color="$color12"
              text="center"
            >
              YOU COMPLETED {reassessmentStatus.pendingForPhase}!
            </Text>
            <Text fontFamily="$body" color="$color10" text="center" maxW={280}>
              Great work finishing this phase. Let's check in before moving on.
            </Text>
          </YStack>
        </Animated.View>

        {/* Stats Cards */}
        {stats && (
          <XStack gap="$3" flexWrap="wrap" justify="center">
            <Animated.View entering={FadeInUp.delay(600).duration(300)}>
              <Card
                minW={100}
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                items="center"
                gap="$2"
              >
                <Dumbbell size={20} color="$primary" />
                <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$primary">
                  {stats.completed}
                </Text>
                <Text fontSize={11} color="$color10" fontFamily="$body" fontWeight="500">
                  Workouts
                </Text>
              </Card>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(680).duration(300)}>
              <Card
                minW={100}
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                items="center"
                gap="$2"
              >
                <TrendingUp size={20} color="$success" />
                <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$success">
                  {completionPercent}%
                </Text>
                <Text fontSize={11} color="$color10" fontFamily="$body" fontWeight="500">
                  Completion
                </Text>
              </Card>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(760).duration(300)}>
              <Card
                minW={100}
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                items="center"
                gap="$2"
              >
                <Calendar size={20} color="$accent" />
                <Text fontFamily="$body" fontWeight="700" fontSize={24} color="$accent">
                  {stats.weeksPerPhase}
                </Text>
                <Text fontSize={11} color="$color10" fontFamily="$body" fontWeight="500">
                  Weeks
                </Text>
              </Card>
            </Animated.View>
          </XStack>
        )}

        {/* Continue Button */}
        <Animated.View
          entering={FadeInUp.delay(900).duration(300)}
          style={{ width: '100%' }}
        >
          <Button
            width="100%"
            size="$5"
            bg="$primary"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            onPress={() => router.push('/(reassessment)/self-assessment' as any)}
          >
            Continue to Check-In
          </Button>
        </Animated.View>
      </YStack>
    </YStack>
  )
}
