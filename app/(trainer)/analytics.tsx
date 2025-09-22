import { YStack, H2, Text } from 'tamagui'

export default function AnalyticsScreen() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" px="$4">
      <H2>Analytics</H2>
      <Text text="center" color="gray">
        Coming soon! View detailed analytics about your clients' progress.
      </Text>
    </YStack>
  )
}
