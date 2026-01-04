import { YStack, XStack, Text, Card, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery } from 'convex/react'
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
})

const Subtitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 14,
  color: '$color10',
})

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
    api.workoutSessions.getHistory,
    user ? {} : "skip"
  )

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
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
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
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
            <DisplayHeading>WORKOUT HISTORY</DisplayHeading>
            <Subtitle>
              Your completed training sessions
            </Subtitle>
          </YStack>

          {/* Sessions List */}
          {sessions && sessions.length > 0 ? (
            <YStack gap="$3">
              {sessions.map((session: any) => (
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
                    >
                      {session.status === 'completed' ? (
                        <CheckCircle size={22} color="$success" />
                      ) : (
                        <XCircle size={22} color="$accent" />
                      )}
                    </YStack>

                    {/* Session Details */}
                    <YStack flex={1} gap="$1">
                      <Text 
                        fontSize={15} 
                        fontFamily="$body" fontWeight="600"
                        color="$color12"
                      >
                        {session.templateSnapshot?.name || session.workout?.name || 'Workout'}
                      </Text>
                      <XStack gap="$3" flexWrap="wrap">
                        <XStack items="center" gap="$1">
                          <Calendar size={13} color="$color10" />
                          <Text fontSize={12} color="$color10" fontFamily="$body">
                            {formatDate(session.startedAt)}
                          </Text>
                        </XStack>
                        {session.totalDuration && (
                          <XStack items="center" gap="$1">
                            <Clock size={13} color="$color10" />
                            <Text fontSize={12} color="$color10" fontFamily="$body">
                              {formatDuration(session.totalDuration)}
                            </Text>
                          </XStack>
                        )}
                        {session.templateSnapshot?.phase && (
                          <XStack items="center" gap="$1">
                            <Dumbbell size={13} color="$color10" />
                            <Text fontSize={12} color="$color10" fontFamily="$body">
                              {session.templateSnapshot.phase} W{session.templateSnapshot.week}D{session.templateSnapshot.day}
                            </Text>
                          </XStack>
                        )}
                      </XStack>
                    </YStack>

                    {/* Status Badge */}
                    <Card
                      bg={session.status === 'completed' ? '$intensityLow2' : '$accent1'}
                      px="$2"
                      py="$1"
                      rounded="$2"
                    >
                      <Text
                        fontSize={10}
                        fontFamily="$body" fontWeight="700"
                        letterSpacing={0.5}
                        color={session.status === 'completed' ? '$success' : '$accent'}
                        textTransform="uppercase"
                      >
                        {session.status}
                      </Text>
                    </Card>
                  </XStack>
                </Card>
              ))}
            </YStack>
          ) : (
            <Card 
              p="$6" 
              bg="$surface" 
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack items="center" gap="$4">
                <YStack bg="$color4" p="$4" rounded="$10">
                  <Calendar size={40} color="$color9" />
                </YStack>
                <YStack items="center" gap="$1">
                  <Text 
                    fontSize={16} 
                    fontFamily="$body" fontWeight="600" 
                    color="$color11"
                  >
                    No Workouts Yet
                  </Text>
                  <Text 
                    color="$color10" 
                    text="center"
                    fontFamily="$body"
                    fontSize={14}
                  >
                    Complete your first workout to see it here!
                  </Text>
                </YStack>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
