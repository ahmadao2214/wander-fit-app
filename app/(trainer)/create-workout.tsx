import { YStack, H2, Text } from 'tamagui'

export default function CreateWorkoutScreen() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" px="$4">
      <H2>Create Workout</H2>
      <Text text="center" color="gray">
        Coming soon! Here you'll be able to create custom workouts for your clients.  
      </Text>
    </YStack>
  )
}
