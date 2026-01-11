import { YStack, XStack, Text, Card, styled } from 'tamagui'
import { ChevronRight, Activity, Calendar, TrendingUp } from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteRosterCardProps {
  athleteName: string
  athleteEmail: string
  sportName: string | null
  currentPhase: string | null
  currentWeek: number | null
  currentDay: number | null
  lastWorkoutDate: number | null
  hasProgram: boolean
  onPress: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = styled(XStack, {
  px: '$2',
  py: '$1',
  rounded: '$2',
  items: 'center',
  gap: '$1',
  variants: {
    variant: {
      active: {
        bg: '$green3',
      },
      inactive: {
        bg: '$color4',
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AthleteRosterCard({
  athleteName,
  athleteEmail,
  sportName,
  currentPhase,
  currentWeek,
  currentDay,
  lastWorkoutDate,
  hasProgram,
  onPress,
}: AthleteRosterCardProps) {
  const getTimeSinceLastWorkout = () => {
    if (!lastWorkoutDate) return 'No workouts yet'

    const now = Date.now()
    const diff = now - lastWorkoutDate
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  const isRecent = lastWorkoutDate && Date.now() - lastWorkoutDate < 7 * 24 * 60 * 60 * 1000

  return (
    <Card
      p="$4"
      bg="$surface"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ scale: 0.98, bg: '$surfaceHover' }}
      onPress={onPress}
    >
      <XStack justify="space-between" items="center">
        <XStack items="center" gap="$3" flex={1}>
          {/* Avatar */}
          <YStack
            width={48}
            height={48}
            rounded="$5"
            bg="$brand2"
            items="center"
            justify="center"
          >
            <Text
              fontFamily="$body"
              fontWeight="700"
              color="$primary"
              fontSize={18}
            >
              {athleteName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </YStack>

          {/* Info */}
          <YStack gap="$1" flex={1}>
            <XStack items="center" gap="$2">
              <Text
                fontFamily="$body"
                fontWeight="600"
                color="$color12"
                fontSize={15}
              >
                {athleteName}
              </Text>
              {sportName && (
                <StatusBadge variant={isRecent ? 'active' : 'inactive'}>
                  <Text
                    fontSize={10}
                    fontFamily="$body"
                    fontWeight="600"
                    color={isRecent ? '$green11' : '$color10'}
                  >
                    {sportName}
                  </Text>
                </StatusBadge>
              )}
            </XStack>

            {hasProgram && currentPhase ? (
              <XStack gap="$3" items="center">
                <XStack items="center" gap="$1">
                  <Activity size={12} color="$color9" />
                  <Text fontSize={12} color="$color10" fontFamily="$body">
                    {PHASE_NAMES[currentPhase as keyof typeof PHASE_NAMES] || currentPhase}
                  </Text>
                </XStack>
                <XStack items="center" gap="$1">
                  <Calendar size={12} color="$color9" />
                  <Text fontSize={12} color="$color10" fontFamily="$body">
                    W{currentWeek}D{currentDay}
                  </Text>
                </XStack>
                <XStack items="center" gap="$1">
                  <TrendingUp size={12} color={isRecent ? '$green9' : '$color9'} />
                  <Text
                    fontSize={12}
                    color={isRecent ? '$green11' : '$color10'}
                    fontFamily="$body"
                  >
                    {getTimeSinceLastWorkout()}
                  </Text>
                </XStack>
              </XStack>
            ) : (
              <Text fontSize={12} color="$color9" fontFamily="$body">
                No program assigned
              </Text>
            )}
          </YStack>
        </XStack>

        <ChevronRight size={20} color="$color9" />
      </XStack>
    </Card>
  )
}

export default AthleteRosterCard
