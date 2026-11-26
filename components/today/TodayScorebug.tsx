import { Pressable } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { thirdCell, type PhaseName, type TodaySeason } from '../../lib/todayScorebug'
import { MARKER } from '../../lib/sportScreen'
import { numeric } from '../Typography'

// The Today scorebug (decision 16, lib/todayScorebug.ts): the week, the phase
// as words and the game readout, on the instrument ground. The week is the
// only sport colour. It sits inside the screen's sport theme, so it plays
// nothing and draws no board.

type Props = {
  week: number
  phase: PhaseName
  phaseStep: number
  phaseOf: number
  season: TodaySeason
  onPress?: () => void
}

function Cell({ label, value, marker, testID }: { label: string; value: string; marker?: boolean; testID: string }) {
  return (
    <YStack flex={1} minW={120} minH={44} px="$3" py="$2" justify="center" testID={testID}>
      {/* Sentence case, like every label in the app: no forced caps */}
      <Text fontFamily="$body" fontSize={12} lineHeight={16} fontWeight="700" color="$color">
        {label}
      </Text>
      <Text
        fontFamily="$body"
        fontSize={20}
        lineHeight={26}
        fontWeight="700"
        color={marker ? MARKER : '$color'}
        style={numeric}
        testID={`${testID}-value`}
      >
        {value}
      </Text>
    </YStack>
  )
}

export function TodayScorebug({ week, phase, phaseStep, phaseOf, season, onPress }: Props) {
  const third = thirdCell(season)
  // The harness sample says "week 1". The live cell does not number the season.
  const seasonValue = season.kind === 'in-season' ? 'In season' : third.value
  const phaseValue = `${phase} ${phaseStep}/${phaseOf}`
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Week ${week}. ${phase}, phase ${phaseStep} of ${phaseOf}. ${third.label} ${seasonValue}. Opens Program.`}
      testID="today-scorebug"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <XStack flexWrap="wrap" bg="$background" borderWidth={1} borderColor="$color" rounded={12} minH={44}>
        <Cell label="Week" value={String(week)} marker testID="scorebug-week" />
        <Cell label="Phase" value={phaseValue} testID="scorebug-phase" />
        <Cell label={third.label} value={seasonValue} testID="scorebug-season" />
      </XStack>
    </Pressable>
  )
}

export default TodayScorebug
