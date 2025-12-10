import { YStack, XStack, H2, Text, Card, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Dumbbell,
} from '@tamagui/lucide-icons'

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

  // Get workout history
  // TODO: Create a query for completed GPP sessions
  const sessions = useQuery(
    api.workoutSessions.getHistory,
    user ? {} : "skip"
  )

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading history...</Text>
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
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$6"
          pb="$8"
          maxW={800}
          width="100%"
          alignSelf="center"
        >
          {/* Header */}
          <YStack gap="$1">
            <H2>Workout History</H2>
            <Text color="$gray11">
              Your completed training sessions
            </Text>
          </YStack>

          {/* Sessions List */}
          {sessions && sessions.length > 0 ? (
            <YStack gap="$3">
              {sessions.map((session: any) => (
                <Card
                  key={session._id}
                  p="$4"
                  bg="$background"
                  borderColor="$gray6"
                  borderWidth={1}
                >
                  <XStack items="center" gap="$3">
                    {/* Status Icon */}
                    {session.status === 'completed' ? (
                      <CheckCircle size={24} color="$green10" />
                    ) : (
                      <XCircle size={24} color="$orange10" />
                    )}

                    {/* Session Details */}
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$4" fontWeight="600">
                        {session.templateSnapshot?.name || session.workout?.name || 'Workout'}
                      </Text>
                      <XStack gap="$3" flexWrap="wrap">
                        <XStack items="center" gap="$1">
                          <Calendar size={14} color="$gray10" />
                          <Text fontSize="$2" color="$gray10">
                            {formatDate(session.startedAt)}
                          </Text>
                        </XStack>
                        {session.totalDuration && (
                          <XStack items="center" gap="$1">
                            <Clock size={14} color="$gray10" />
                            <Text fontSize="$2" color="$gray10">
                              {formatDuration(session.totalDuration)}
                            </Text>
                          </XStack>
                        )}
                        {session.templateSnapshot?.phase && (
                          <XStack items="center" gap="$1">
                            <Dumbbell size={14} color="$gray10" />
                            <Text fontSize="$2" color="$gray10">
                              {session.templateSnapshot.phase} W{session.templateSnapshot.week}D{session.templateSnapshot.day}
                            </Text>
                          </XStack>
                        )}
                      </XStack>
                    </YStack>

                    {/* Status Badge */}
                    <Card
                      bg={session.status === 'completed' ? '$green3' : '$orange3'}
                      px="$2"
                      py="$1"
                      borderRadius="$4"
                    >
                      <Text
                        fontSize="$1"
                        fontWeight="600"
                        color={session.status === 'completed' ? '$green11' : '$orange11'}
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
            <Card p="$6" bg="$gray2" borderColor="$gray6">
              <YStack items="center" gap="$3">
                <Calendar size={48} color="$gray8" />
                <Text fontSize="$4" fontWeight="600" color="$gray11">
                  No Workouts Yet
                </Text>
                <Text color="$gray10" textAlign="center">
                  Complete your first workout to see it here!
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

