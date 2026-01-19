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
    <YStack>
      {phases.map((phase, index) => (
        <XStack key={phase.phase} gap="$3">
          {/* Timeline indicator */}
          <YStack items="center" width={36}>
            {/* Phase marker */}
            <YStack
              width={36}
              height={36}
              rounded="$10"
              bg={phase.isCurrent ? '$primary' : phase.isCompleted ? '$color8' : '$color5'}
              items="center"
              justify="center"
              borderWidth={phase.isCurrent ? 2 : 0}
              borderColor="$primary"
            >
              <Text
                fontSize="$3"
                fontWeight="bold"
                color={phase.isCurrent || phase.isCompleted ? 'white' : '$color10'}
              >
                {index + 1}
              </Text>
            </YStack>

            {/* Connector line (bottom) - always show to connect all phases + program complete */}
            <YStack
              width={2}
              height={40}
              bg={phase.isCompleted ? '$color8' : '$color5'}
            />
          </YStack>

          {/* Phase content */}
          <YStack flex={1} pb="$3">
            <XStack justify="space-between" items="flex-start">
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="bold" color="$color12">
                  {PHASE_DATA[phase.phase].name}
                </Text>
                <Text fontSize="$3" color="$color11" mt="$1">
                  {PHASE_DATA[phase.phase].tagline}
                </Text>
              </YStack>

              {phase.isCurrent && (
                <YStack bg="$blue4" px="$2" py="$1" rounded="$2">
                  <Text fontSize="$1" color="$blue11" fontWeight="700">
                    CURRENT
                  </Text>
                </YStack>
              )}
            </XStack>

            {/* Date range */}
            <Text fontSize="$2" color="$color9" mt="$2">
              {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
            </Text>
          </YStack>
        </XStack>
      ))}

      {/* Program End indicator - connected to timeline */}
      <XStack gap="$3">
        <YStack items="center" width={36}>
          <YStack
            width={32}
            height={32}
            rounded="$10"
            bg="$color5"
            items="center"
            justify="center"
          >
            <Text fontSize="$3" fontWeight="bold" color="$color10">
              ✓
            </Text>
          </YStack>
        </YStack>

        <YStack flex={1} justify="center">
          <Text fontSize="$3" fontWeight="600" color="$color12">
            Program Complete
          </Text>
          {phases.length > 0 && (
            <Text fontSize="$2" color="$color9" mt="$1">
              {formatDate(phases[phases.length - 1].endDate)}
            </Text>
          )}
        </YStack>
      </XStack>
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
