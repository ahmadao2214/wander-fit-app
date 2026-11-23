import React from 'react'
import { XStack, YStack, type GetThemeValueForKey } from 'tamagui'
import type { Phase } from '../../types'
import { phaseTrack } from '../../lib/profile'
import { Caption, Supporting, numeric } from '../Typography'

/**
 * The program's three phases as one row of bars, for the navy Profile header.
 * Earlier phases are full, later ones empty, and the current one fills to
 * week / weeksPerPhase. VoiceOver reads the whole track once, as a progress
 * bar; the texts inside are hidden from it.
 *
 * The colours default to values for the navy header, not the theme.
 */
/** A theme token or a fixed colour; the header's surface doesn't follow the theme. */
type PhaseTrackColor = GetThemeValueForKey<'color'>

export interface PhaseTrackProps {
  phase: Phase | string | null | undefined
  week: number
  weeksPerPhase?: number | null
  totalProgramWeeks?: number | null
  trackColor?: PhaseTrackColor
  fillColor?: PhaseTrackColor
  currentTextColor?: PhaseTrackColor
  textColor?: PhaseTrackColor
  testID?: string
}

const BAR_HEIGHT = 6

export function PhaseTrack({
  phase,
  week,
  weeksPerPhase,
  totalProgramWeeks,
  trackColor = 'rgba(255,255,255,0.14)',
  fillColor = '$brand5',
  currentTextColor = '#F8FAFC',
  textColor = '#94A3B8',
  testID = 'phase-track',
}: PhaseTrackProps) {
  const track = phaseTrack({ phase, week, weeksPerPhase, totalProgramWeeks })

  return (
    <XStack
      gap="$1"
      accessible
      accessibilityRole="progressbar"
      role="progressbar"
      aria-label={track.accessibilityLabel}
      accessibilityLabel={track.accessibilityLabel}
      testID={testID}
    >
      {track.segments.map((segment) => {
        const color = segment.current ? currentTextColor : textColor
        return (
          <YStack
            key={segment.phase}
            flex={1}
            gap="$2"
            testID={`${testID}-segment-${segment.phase}`}
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <YStack height={BAR_HEIGHT} rounded={BAR_HEIGHT / 2} bg={trackColor} overflow="hidden">
              <YStack
                testID={`${testID}-fill-${segment.phase}`}
                height="100%"
                width={`${segment.fill * 100}%`}
                rounded={BAR_HEIGHT / 2}
                bg={fillColor}
              />
            </YStack>
            <YStack>
              <Supporting fontWeight="600" color={color}>
                {segment.phase}
              </Supporting>
              <Caption color={color} style={numeric}>
                {segment.label}
              </Caption>
            </YStack>
          </YStack>
        )
      })}
    </XStack>
  )
}
