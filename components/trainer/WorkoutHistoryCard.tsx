import { YStack, XStack, Text, Card, styled } from 'tamagui'
import { Clock, Check, X, Activity } from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface WorkoutHistoryCardProps {
  templateName: string
  phase?: string
  week?: number
  day?: number
  startedAt: number
  completedAt?: number
  status: 'in_progress' | 'completed' | 'abandoned'
  totalDurationSeconds?: number
  exerciseCount: number
  completedExerciseCount: number
  skippedExerciseCount: number
  targetIntensity?: string
  onPress?: () => void
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
    status: {
      completed: {
        bg: '$green3',
      },
      in_progress: {
        bg: '$yellow3',
      },
      abandoned: {
        bg: '$red3',
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function WorkoutHistoryCard({
  templateName,
  phase,
  week,
  day,
  startedAt,
  completedAt,
  status,
  totalDurationSeconds,
  exerciseCount,
  completedExerciseCount,
  skippedExerciseCount,
  targetIntensity,
  onPress,
}: WorkoutHistoryCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hrs}h ${remainingMins}m`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return '$green11'
      case 'in_progress':
        return '$yellow11'
      case 'abandoned':
        return '$red11'
      default:
        return '$color10'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      case 'abandoned':
        return 'Abandoned'
      default:
        return status
    }
  }

  return (
    <Card
      p="$4"
      bg="$surface"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={onPress ? { scale: 0.98, bg: '$surfaceHover' } : undefined}
      onPress={onPress}
    >
      <YStack gap="$3">
        {/* Header */}
        <XStack justify="space-between" items="flex-start">
          <YStack gap="$1" flex={1}>
            <Text
              fontFamily="$body"
              fontWeight="600"
              color="$color12"
              fontSize={15}
            >
              {templateName}
            </Text>
            {phase && (
              <XStack items="center" gap="$2">
                <Text fontSize={12} color="$color10" fontFamily="$body">
                  {PHASE_NAMES[phase as keyof typeof PHASE_NAMES] || phase}
                </Text>
                {week && day && (
                  <Text fontSize={12} color="$color9" fontFamily="$body">
                    W{week}D{day}
                  </Text>
                )}
              </XStack>
            )}
          </YStack>
          <StatusBadge status={status}>
            {status === 'completed' ? (
              <Check size={12} color={getStatusColor()} />
            ) : status === 'abandoned' ? (
              <X size={12} color={getStatusColor()} />
            ) : (
              <Activity size={12} color={getStatusColor()} />
            )}
            <Text
              fontSize={10}
              fontFamily="$body"
              fontWeight="600"
              color={getStatusColor()}
            >
              {getStatusText()}
            </Text>
          </StatusBadge>
        </XStack>

        {/* Date and Time */}
        <XStack items="center" gap="$3">
          <Text fontSize={13} color="$color10" fontFamily="$body">
            {formatDate(startedAt)}
          </Text>
          <Text fontSize={13} color="$color9" fontFamily="$body">
            {formatTime(startedAt)}
          </Text>
          {totalDurationSeconds && (
            <XStack items="center" gap="$1">
              <Clock size={12} color="$color9" />
              <Text fontSize={13} color="$color10" fontFamily="$body">
                {formatDuration(totalDurationSeconds)}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Exercise Summary */}
        <XStack gap="$4" items="center">
          <XStack items="center" gap="$1">
            <Check size={14} color="$green9" />
            <Text fontSize={12} color="$green11" fontFamily="$body">
              {completedExerciseCount}/{exerciseCount} exercises
            </Text>
          </XStack>
          {skippedExerciseCount > 0 && (
            <XStack items="center" gap="$1">
              <X size={14} color="$red9" />
              <Text fontSize={12} color="$red11" fontFamily="$body">
                {skippedExerciseCount} skipped
              </Text>
            </XStack>
          )}
          {targetIntensity && (
            <Text fontSize={12} color="$color9" fontFamily="$body">
              {targetIntensity} intensity
            </Text>
          )}
        </XStack>
      </YStack>
    </Card>
  )
}

export default WorkoutHistoryCard
