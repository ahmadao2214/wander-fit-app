import { Pressable } from 'react-native'
import { Circle, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons'

/** One option of a single-choice question: a full-width row, 56pt tall. */
export function ChoiceRow({
  label,
  detail,
  selected,
  onPress,
  testID,
}: {
  label: string
  detail?: string
  selected: boolean
  onPress: () => void
  testID?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      testID={testID}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <XStack
        minH={56}
        px="$4"
        py="$3"
        items="center"
        gap="$3"
        rounded="$4"
        borderWidth={2}
        borderColor={selected ? '$primary' : '$borderColor'}
        bg={selected ? '$brand2' : '$surface'}
      >
        <YStack flex={1} gap="$0.5">
          <Text fontFamily="$body" fontSize={16} fontWeight={selected ? '700' : '600'} color="$color12">
            {label}
          </Text>
          {detail ? (
            <Text fontFamily="$body" fontSize={14} color="$color11">
              {detail}
            </Text>
          ) : null}
        </YStack>
        <Circle
          size={24}
          borderWidth={2}
          borderColor={selected ? '$primary' : '$color8'}
          bg={selected ? '$primary' : 'transparent'}
        >
          {selected ? <Check size={14} color="white" strokeWidth={3} /> : null}
        </Circle>
      </XStack>
    </Pressable>
  )
}
