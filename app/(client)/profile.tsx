import { YStack, H2, Text } from 'tamagui'

export default function ProfileScreen() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" px="$4">
      <H2>Profile</H2>
      <Text text="center" color="gray">
        Coming soon! Manage your profile and account settings.
      </Text>
    </YStack>
  )
}
