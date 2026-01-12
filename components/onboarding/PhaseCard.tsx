import { YStack, XStack, Text } from 'tamagui'
import { Lock, CheckCircle, Circle } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'

interface PhaseCardProps {
  /** Phase identifier */
  phase: Phase
  /** Full phase name */
  name: string
  /** Short tagline for the phase */
  tagline: string
  /** Duration description (e.g., "Weeks 1-4") */
  duration: string
  /** Whether this phase is unlocked */
  isUnlocked: boolean
  /** Whether this is the current/active phase */
  isCurrent: boolean
  /** Whether the phase is completed */
  isCompleted?: boolean
  /** Optional press handler */
  onPress?: () => void
}

/**
 * PhaseCard - Displays information about a training phase
 *
 * Shows the phase name, tagline, duration, and status (locked/current/completed).
 * Used in the phase education screens to explain GPP/SPP/SSP.
 */
export function PhaseCard({
  phase,
  name,
  tagline,
  duration,
  isUnlocked,
  isCurrent,
  isCompleted = false,
  onPress,
}: PhaseCardProps) {
  // Determine the status icon
  const StatusIcon = isCompleted
    ? CheckCircle
    : isCurrent
      ? Circle
      : !isUnlocked
        ? Lock
        : Circle

  // Determine colors based on state
  const borderColor = isCurrent
    ? '$green10'
    : isCompleted
      ? '$green8'
      : isUnlocked
        ? '$gray6'
        : '$gray4'

  const bgColor = isCurrent
    ? '$green2'
    : isCompleted
      ? '$green1'
      : '$gray1'

  const iconColor = isCompleted
    ? '$green10'
    : isCurrent
      ? '$green10'
      : !isUnlocked
        ? '$gray8'
        : '$gray10'

  return (
    <YStack
      bg={bgColor}
      br="$4"
      p="$4"
      borderWidth={2}
      borderColor={borderColor}
      opacity={isUnlocked ? 1 : 0.7}
      pressStyle={onPress ? { scale: 0.98 } : undefined}
      onPress={onPress}
      animation="quick"
    >
      <XStack justify="space-between" items="flex-start">
        <YStack flex={1} gap="$2">
          {/* Phase badge */}
          <XStack gap="$2" items="center">
            <Text
              fontSize="$2"
              fontWeight="600"
              color={isCurrent ? '$green11' : '$gray10'}
              textTransform="uppercase"
              letterSpacing={1}
            >
              {phase}
            </Text>
            <Text fontSize="$2" color="$gray9">
              •
            </Text>
            <Text fontSize="$2" color="$gray9">
              {duration}
            </Text>
          </XStack>

          {/* Phase name */}
          <Text fontSize="$5" fontWeight="bold" color="$gray12">
            {name}
          </Text>

          {/* Tagline */}
          <Text fontSize="$3" color="$gray11">
            {tagline}
          </Text>
        </YStack>

        {/* Status icon */}
        <YStack
          width={32}
          height={32}
          br={16}
          bg={isCurrent ? '$green4' : '$gray3'}
          items="center"
          justify="center"
        >
          <StatusIcon size={18} color={iconColor} />
        </YStack>
      </XStack>

      {/* Current phase indicator */}
      {isCurrent && (
        <XStack mt="$3" pt="$3" borderTopWidth={1} borderColor="$green4">
          <Text fontSize="$2" color="$green11" fontWeight="500">
            You are here
          </Text>
        </XStack>
      )}
    </YStack>
  )
}

/**
 * Phase data for use in onboarding screens
 */
export const PHASE_DATA: Record<Phase, { name: string; tagline: string; duration: string }> = {
  GPP: {
    name: 'General Physical Preparedness',
    tagline: 'Build Your Foundation',
    duration: 'Weeks 1-4',
  },
  SPP: {
    name: 'Specific Physical Preparedness',
    tagline: 'Sharpen Your Skills',
    duration: 'Weeks 5-8',
  },
  SSP: {
    name: 'Sport-Specific Preparedness',
    tagline: 'Peak Performance',
    duration: 'Weeks 9-12',
  },
}
