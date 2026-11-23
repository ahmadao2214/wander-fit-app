import { Text, XStack, YStack, useThemeName } from 'tamagui'
import { PHASE_NAMES } from '../../lib/phase'
import { phaseTrack } from '../../lib/profile'
import { Supporting, numeric } from '../Typography'
import { PhaseTrack } from './PhaseTrack'

/** Text on the navy header. The header keeps its colour in both themes. */
const ON_NAVY = '#F8FAFC'
const ON_NAVY_MUTED = '#CBD5E1'
/** $brand5 as a fixed colour: the token darkens in the dark theme and loses the track. */
const TRACK_FILL = '#60A5FA'

/**
 * Extra navy above the header, so pulling the list down on iOS shows more
 * header and not the page background.
 */
const OVERSCROLL = 400

export interface ProfileHeaderProps {
  name: string
  /** Space for the status bar and notch. */
  topInset: number
  /** Room at the bottom for the maxes card that overlaps the header's edge. */
  overlap?: number
  /** Reports the header's visible height (without the hidden overscroll band). */
  onHeight?: (height: number) => void
  program?: {
    phase: string
    week: number
    day?: number | null
    weeksPerPhase?: number | null
    totalProgramWeeks?: number | null
    skillLevel?: string | null
    sportName?: string | null
  } | null
}

/**
 * The top of Profile: navy to the top of the screen, the athlete's name as
 * the page title, then where they are in the program's three phases.
 */
export function ProfileHeader({
  name,
  topInset,
  overlap = 0,
  onHeight,
  program,
}: ProfileHeaderProps) {
  // Navy on the dark theme's navy page has no edge, so dark goes one step deeper
  const dark = useThemeName().startsWith('dark')
  const who = program ? [program.skillLevel, program.sportName].filter(Boolean).join(' · ') : ''
  const phaseName = program ? PHASE_NAMES[program.phase as keyof typeof PHASE_NAMES] : undefined
  const summary = program ? phaseTrack(program).summary : ''
  const position = program?.day ? `${summary} · Day ${program.day}` : summary

  return (
    <YStack
      bg={dark ? '$backgroundStrong' : '$brand12'}
      mt={-OVERSCROLL}
      pt={OVERSCROLL + topInset + 16}
      pb={overlap + 24}
      onLayout={
        onHeight ? (event) => onHeight(event.nativeEvent.layout.height - OVERSCROLL) : undefined
      }
      testID="profile-header"
    >
      <YStack width="100%" maxW={800} self="center" px="$4" gap="$4.5">
        <YStack gap="$1">
          <Text
            accessibilityRole="header"
            fontFamily="$heading"
            fontSize={48}
            lineHeight={44}
            letterSpacing={0.5}
            color={ON_NAVY}
            testID="profile-name"
          >
            {name}
          </Text>
          {who ? <Supporting color={ON_NAVY_MUTED}>{who}</Supporting> : null}
        </YStack>

        {program ? (
          <YStack gap="$2.5">
            <XStack items="flex-start" justify="space-between" gap="$3">
              <Supporting flex={1} numberOfLines={2} color={ON_NAVY_MUTED}>
                {phaseName ?? program.phase}
              </Supporting>
              <Supporting color={ON_NAVY} fontWeight="600" style={numeric} testID="profile-week">
                {position}
              </Supporting>
            </XStack>
            <PhaseTrack
              phase={program.phase}
              week={program.week}
              weeksPerPhase={program.weeksPerPhase}
              totalProgramWeeks={program.totalProgramWeeks}
              fillColor={TRACK_FILL}
            />
          </YStack>
        ) : null}
      </YStack>
    </YStack>
  )
}
