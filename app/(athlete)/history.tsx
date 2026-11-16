import { YStack, XStack, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Dumbbell,
} from '@tamagui/lucide-icons'
import { Display, Body, Supporting, Caption, numeric } from '../../components/Typography'
import { progressCaption } from '../../lib/today'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * History Tab - Completed Workouts Log
 * 
 * Shows all completed workout sessions with:
 * - Date and duration
 * - Workout name and phase
 * - Completion status
 */
export default function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const insets = useSafeAreaInsets()

  const sessions = useQuery(
    api.gppWorkoutSessions.getHistory,
    user ? {} : "skip"
  )
  // How much has been done: History is where progress lives (design audit F06)
  const progress = useQuery(
    api.userPrograms.getProgressSummary,
    user ? {} : "skip"
  )
  const progressLine = progress
    ? progressCaption({ workoutsCompleted: progress.daysCompleted, currentStreak: progress.currentStreak })
    : null
  // A session still in progress belongs on Today, not in the log
  const finishedSessions = sessions?.filter((session) => session.status !== 'in_progress')

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primaryText" />
        <Text color="$color10" fontFamily="$body">
          Loading history...
        </Text>
      </YStack>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ grow: 1 }}
      >
        <YStack
          flex={1}
          gap="$5"
          px="$4"
          pt={insets.top + 16}
          pb={insets.bottom + 100}
          maxW={800}
          width="100%"
          self="center"
        >
          {/* Header */}
          <YStack gap="$1">
            <Display>Workout history</Display>
            <Supporting color="$color10" style={numeric} testID="history-progress">
              {progressLine ?? 'Your completed training sessions'}
            </Supporting>
          </YStack>

          {/* Sessions List */}
          {finishedSessions && finishedSessions.length > 0 ? (
            <YStack gap="$3">
              {finishedSessions.map((session) => (
                <Card
                  key={session._id}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ bg: '$surfaceHover' }}
                >
                  <XStack items="center" gap="$3">
                    {/* Status Icon */}
                    <YStack
                      width={44}
                      height={44}
                      rounded="$5"
                      bg={session.status === 'completed' ? '$intensityLow2' : '$accent1'}
                      items="center"
                      justify="center"
                      // Completed rows have no chip, so the check carries the spoken
                      // status; unfinished rows say it in their chip
                      accessible={session.status === 'completed'}
                      accessibilityLabel={session.status === 'completed' ? 'Completed' : undefined}
                      testID={session.status === 'completed' ? 'history-completed' : undefined}
                    >
                      {session.status === 'completed' ? (
                        <CheckCircle size={22} color="$green10" />
                      ) : (
                        <XCircle size={22} color="$orange10" />
                      )}
                    </YStack>

                    {/* Session Details */}
                    <YStack flex={1} gap="$1">
                      <Body fontWeight="600">
                        {session.templateSnapshot?.name || session.templateName}
                      </Body>
                      <XStack gap="$3" flexWrap="wrap">
                        <XStack items="center" gap="$1">
                          <Calendar size={13} color="$color10" />
                          <Caption>{formatDate(session.startedAt)}</Caption>
                        </XStack>
                        {session.totalDurationSeconds ? (
                          <XStack items="center" gap="$1">
                            <Clock size={13} color="$color10" />
                            <Caption style={numeric}>{formatDuration(session.totalDurationSeconds)}</Caption>
                          </XStack>
                        ) : null}
                        {session.templateSnapshot?.phase && (
                          <XStack items="center" gap="$1">
                            <Dumbbell size={13} color="$color10" />
                            <Caption>
                              {session.templateSnapshot.phase} W{session.templateSnapshot.week}D{session.templateSnapshot.day}
                            </Caption>
                          </XStack>
                        )}
                      </XStack>
                    </YStack>

                    {/* Completed is the normal case: the green check says it, no chip.
                        An unfinished session gets a plain-language chip. */}
                    {session.status !== 'completed' && (
                      <Card bg="$orange2" px="$2" py="$1" rounded="$2" testID="history-not-finished">
                        <Caption fontWeight="600" color="$orange11">
                          Not finished
                        </Caption>
                      </Card>
                    )}
                  </XStack>
                </Card>
              ))}
            </YStack>
          ) : (
            <HistoryEmptyState />
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

/** Faded rows in the shape of a logged workout, so the empty tab shows what it will hold. */
function GhostRow({ opacity }: { opacity: number }) {
  return (
    <XStack
      width="100%"
      items="center"
      gap="$3"
      p="$3"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      bg="$surface"
      opacity={opacity}
    >
      <YStack width={36} height={36} rounded="$4" bg="$color4" items="center" justify="center">
        <CheckCircle size={18} color="$color8" />
      </YStack>
      <YStack flex={1} gap="$2">
        <YStack height={10} width="62%" rounded="$2" bg="$color5" />
        <YStack height={8} width="38%" rounded="$2" bg="$color4" />
      </YStack>
    </XStack>
  )
}

function HistoryEmptyState() {
  const router = useRouter()
  return (
    <YStack flex={1} items="center" justify="center" gap="$5" pb="$8">
      <YStack
        width="100%"
        maxW={320}
        gap="$2"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <GhostRow opacity={0.9} />
        <GhostRow opacity={0.55} />
        <GhostRow opacity={0.25} />
      </YStack>
      <Body fontWeight="600">No workouts yet</Body>
      <Button
        size="$4"
        bg="$primary"
        color="white"
        fontFamily="$body"
        fontWeight="600"
        rounded="$4"
        pressStyle={{ scale: 0.97, bg: '$primaryPress' }}
        onPress={() => router.navigate('/(athlete)')}
      >
        Go to today's workout
      </Button>
    </YStack>
  )
}
