import { YStack, H2, Text } from 'tamagui'

export default function HistoryScreen() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" px="$4">
      <H2>Workout History</H2>
      <Text text="center" color="gray">
        Coming soon! View your past workout sessions and progress.
      </Text>
    </YStack>
  )
}
