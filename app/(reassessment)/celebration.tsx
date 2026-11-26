import { useEffect } from 'react'
import { YStack, Button, Card, Spinner, Theme } from 'tamagui'
import { useSportScheme } from '../../hooks/useSportScheme'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Display, Title, Body, Supporting, numeric } from '../../components/Typography'
import { blockDates, blockEnd, blockRecap } from '../../lib/reassessment'
import { phaseWord } from '../../lib/sportScreen'

/**
 * Block recap, screen 1 of the end-of-block check-in.
 *
 * Says what actually happened in the block: a finished block says so in its
 * title, and a block that ended with sessions missed is stated plainly
 * (design audit F04). On the sport theme there is no confetti (issue #209).
 * Everything is on screen at once, with no staged entrances (F11). Redirects
 * to Today if no check-in is pending.
 */
function CelebrationScreenContent() {
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
        <Spinner size="large" color="$color" />
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
              {stats.blockStartedAt ? ` · ${blockDates(stats.blockStartedAt, blockEnd(stats.blockStartedAt, stats.weeksPerPhase))}` : ''}
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
            A short check-in, then you choose: move on to {phaseWord(reassessmentStatus.nextPhase)} or repeat {phaseWord(phase)}.
          </Supporting>
          <Button
            width="100%"
            size="$5"
            bg="$primary"
            color="$background"
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

/** On the basketball sport theme (issue #209): dark → chalkboard, light → whiteboard. */
export default function CelebrationScreen() {
  const scheme = useSportScheme()
  return (
    <Theme name={scheme}>
      <CelebrationScreenContent />
    </Theme>
  )
}
