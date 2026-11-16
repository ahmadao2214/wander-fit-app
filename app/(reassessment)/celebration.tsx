import { useEffect } from 'react'
import { YStack, Button, Card, Spinner } from 'tamagui'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { useReducedMotion } from 'react-native-reanimated'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConfettiEffect } from '../../components/workout/ConfettiEffect'
import { Display, Title, Body, Supporting, numeric } from '../../components/Typography'
import { blockDates, blockRecap } from '../../lib/reassessment'

/**
 * Block recap, screen 1 of the end-of-block check-in.
 *
 * Says what actually happened in the block: a finished block is celebrated
 * once, and a block that ended with sessions missed is stated plainly
 * (design audit F04). Everything is on screen at once, with no staged
 * entrances (F11). Redirects to Today if no check-in is pending.
 */
export default function CelebrationScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()

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
        <Spinner size="large" color="$primaryText" />
        <Supporting color="$color10">Loading...</Supporting>
      </YStack>
    )
  }

  if (!reassessmentStatus?.reassessmentPending || !reassessmentStatus.pendingForPhase) {
    return null
  }

  const phase = reassessmentStatus.pendingForPhase
  const stats = reassessmentStatus.completionStats
  const recap = blockRecap(phase, stats?.completed ?? 0, stats?.expected ?? 0)

  return (
    <YStack flex={1} bg="$background" testID={`block-recap-${recap.outcome}`}>
      {/* One celebration, only for a finished block, and none with Reduce Motion on */}
      {recap.celebrate && !reduceMotion && <ConfettiEffect trigger />}

      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 24}
        pb={insets.bottom + 24}
        justify="center"
        gap="$6"
        maxW={600}
        width="100%"
        self="center"
      >
        <YStack gap="$2">
          <Display accessibilityRole="header">{recap.title}</Display>
          {stats && (
            <Supporting color="$color10" style={numeric}>
              {stats.weeksPerPhase} {stats.weeksPerPhase === 1 ? 'week' : 'weeks'}
              {stats.blockStartedAt ? ` · ${blockDates(stats.blockStartedAt, Date.now())}` : ''}
            </Supporting>
          )}
        </YStack>

        <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor" gap="$1">
          <Title style={numeric} testID="block-recap-sessions">
            {recap.sessions}
          </Title>
          <Body color="$color11">{recap.summary}</Body>
        </Card>

        <YStack gap="$3">
          <Supporting color="$color11">
            A short check-in, then you choose: move on to {reassessmentStatus.nextPhase} or repeat {phase}.
          </Supporting>
          <Button
            width="100%"
            size="$5"
            bg="$primary"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
            onPress={() => router.push('/(reassessment)/self-assessment' as any)}
            testID="block-recap-continue"
          >
            Start check-in
          </Button>
        </YStack>
      </YStack>
    </YStack>
  )
}
