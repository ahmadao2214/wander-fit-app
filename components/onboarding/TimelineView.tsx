import { YStack, XStack, Text } from 'tamagui'
import type { Phase } from '../../types'
import { PHASE_DATA } from './PhaseCard'

interface TimelinePhase {
  phase: Phase
  startDate: Date
  endDate: Date
  isCurrent: boolean
  isCompleted: boolean
}

interface TimelineViewProps {
  /** The phases to display in the timeline */
  phases: TimelinePhase[]
  /** Optional: Season start date to show as endpoint */
  seasonStartDate?: Date
  /** Orientation of the timeline */
  orientation?: 'horizontal' | 'vertical'
}

/**
 * TimelineView - Visual timeline showing the training phases
 *
 * Displays the 12-week training journey with phase markers and dates.
 * Highlights the current phase and shows completion status.
 */
export function TimelineView({
  phases,
  seasonStartDate,
  orientation = 'vertical',
}: TimelineViewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (orientation === 'horizontal') {
    return (
      <XStack gap="$2" items="center" justify="space-between">
        {phases.map((phase, index) => (
          <YStack key={phase.phase} flex={1} items="center" gap="$2">
            {/* Phase marker */}
            <YStack
              width={40}
              height={40}
              rounded="$10"
              bg={phase.isCurrent ? '$green10' : phase.isCompleted ? '$green8' : '$gray4'}
              items="center"
              justify="center"
            >
              <Text
                fontSize="$2"
                fontWeight="bold"
                color={phase.isCurrent || phase.isCompleted ? 'white' : '$gray10'}
              >
                {index + 1}
              </Text>
            </YStack>

            {/* Phase name */}
            <Text fontSize="$2" fontWeight="600" color="$gray12">
              {phase.phase}
            </Text>

            {/* Date range */}
            <Text fontSize="$1" color="$gray9">
              {formatDate(phase.startDate)}
            </Text>

            {/* Connector line */}
            {index < phases.length - 1 && (
              <YStack
                position="absolute"
                width={20}
                height={2}
                bg={phase.isCompleted ? '$green8' : '$gray4'}
                style={{ right: -10, top: 20 }}
              />
            )}
          </YStack>
        ))}
      </XStack>
    )
  }

  // Vertical orientation (default)
  return (
    <YStack gap="$4">
      {phases.map((phase, index) => (
        <XStack key={phase.phase} gap="$4">
          {/* Timeline indicator */}
          <YStack items="center" width={40}>
            {/* Connector line (top) */}
            {index > 0 && (
              <YStack
                width={2}
                height={16}
                bg={phases[index - 1].isCompleted ? '$green8' : '$gray4'}
              />
            )}

            {/* Phase marker */}
            <YStack
              width={40}
              height={40}
              rounded="$10"
              bg={phase.isCurrent ? '$green10' : phase.isCompleted ? '$green8' : '$gray4'}
              items="center"
              justify="center"
              borderWidth={phase.isCurrent ? 3 : 0}
              borderColor="$green6"
            >
              <Text
                fontSize="$3"
                fontWeight="bold"
                color={phase.isCurrent || phase.isCompleted ? 'white' : '$gray10'}
              >
                {phase.phase.charAt(0)}
              </Text>
            </YStack>

            {/* Connector line (bottom) */}
            {index < phases.length - 1 && (
              <YStack
                flex={1}
                width={2}
                height={16}
                bg={phase.isCompleted ? '$green8' : '$gray4'}
              />
            )}
          </YStack>

          {/* Phase content */}
          <YStack flex={1} pb={index < phases.length - 1 ? '$4' : 0}>
            <XStack justify="space-between" items="flex-start">
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="bold" color="$gray12">
                  {PHASE_DATA[phase.phase].name}
                </Text>
                <Text fontSize="$3" color="$gray11" mt="$1">
                  {PHASE_DATA[phase.phase].tagline}
                </Text>
              </YStack>

              {phase.isCurrent && (
                <YStack bg="$green4" px="$2" py="$1" rounded="$2">
                  <Text fontSize="$1" color="$green11" fontWeight="600">
                    CURRENT
                  </Text>
                </YStack>
              )}
            </XStack>

            {/* Date range */}
            <Text fontSize="$2" color="$gray9" mt="$2">
              {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
            </Text>
          </YStack>
        </XStack>
      ))}

      {/* Season start indicator */}
      {seasonStartDate && (
        <XStack gap="$4" mt="$2">
          <YStack items="center" width={40}>
            <YStack
              width={2}
              height={16}
              bg="$gray4"
            />
            <YStack
              width={32}
              height={32}
              rounded="$10"
              bg="$blue4"
              items="center"
              justify="center"
            >
              <Text fontSize="$2" color="$blue11">
                🏆
              </Text>
            </YStack>
          </YStack>

          <YStack flex={1}>
            <Text fontSize="$3" fontWeight="600" color="$gray12">
              Season Starts
            </Text>
            <Text fontSize="$2" color="$gray9" mt="$1">
              {formatDate(seasonStartDate)}
            </Text>
          </YStack>
        </XStack>
      )}
    </YStack>
  )
}

/**
 * Helper to create phase timeline data from a start date
 */
export function createPhaseTimeline(startDate: Date): TimelinePhase[] {
  const phases: Phase[] = ['GPP', 'SPP', 'SSP']
  const weeksPerPhase = 4

  return phases.map((phase, index) => {
    const phaseStartDate = new Date(startDate)
    phaseStartDate.setDate(phaseStartDate.getDate() + index * weeksPerPhase * 7)

    const phaseEndDate = new Date(phaseStartDate)
    phaseEndDate.setDate(phaseEndDate.getDate() + weeksPerPhase * 7 - 1)

    return {
      phase,
      startDate: phaseStartDate,
      endDate: phaseEndDate,
      isCurrent: index === 0, // First phase is always current for new users
      isCompleted: false,
    }
  })
}
