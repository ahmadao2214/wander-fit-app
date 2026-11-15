import { useState } from 'react'
import { Pressable } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { PHASES, PHASE_NAMES, phaseTitle, phaseTokens } from '../../lib/phase'
import type { Phase } from '../../types'

/**
 * The three phases as one bar, each segment as wide as its weeks and always
 * labeled. Tapping a segment shows its full name underneath, so there's no
 * separate explainer screen.
 */
export function PhaseBar({ weeksPerPhase }: { weeksPerPhase: number }) {
  const [open, setOpen] = useState<Phase>('GPP')

  return (
    <YStack gap="$2" testID="phase-bar">
      <XStack gap="$1" height={48}>
        {PHASES.map((phase, i) => {
          const { fill, onFill } = phaseTokens(phase)
          const selected = open === phase
          return (
            <Pressable
              key={phase}
              onPress={() => setOpen(phase)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${phase}, ${PHASE_NAMES[phase]}, ${weeksPerPhase} weeks`}
              testID={`phase-${phase}`}
              style={{ flex: weeksPerPhase }}
            >
              <YStack
                flex={1}
                bg={fill}
                justify="center"
                px="$3"
                borderTopLeftRadius={i === 0 ? '$4' : '$1'}
                borderBottomLeftRadius={i === 0 ? '$4' : '$1'}
                borderTopRightRadius={i === PHASES.length - 1 ? '$4' : '$1'}
                borderBottomRightRadius={i === PHASES.length - 1 ? '$4' : '$1'}
                borderBottomWidth={selected ? 3 : 0}
                borderBottomColor={onFill}
              >
                <Text fontFamily="$body" fontSize={14} fontWeight="700" color={onFill}>
                  {phase}
                </Text>
                <Text fontFamily="$body" fontSize={12} color={onFill} opacity={0.85}>
                  {weeksPerPhase} wk
                </Text>
              </YStack>
            </Pressable>
          )
        })}
      </XStack>
      <Text fontFamily="$body" fontSize={14} color="$color11" testID="phase-name">
        {phaseTitle(open)}
      </Text>
    </YStack>
  )
}
