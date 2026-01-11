import { YStack, Text, Card, styled } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Calendar as CalendarIcon } from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 1,
  color: '$color12',
  text: 'center',
})

const Subtitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  color: '$color10',
  text: 'center',
  lineHeight: 22,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Family Calendar Screen
 *
 * Placeholder for PR 6: Family Calendar & Parent Workout Control
 * Will show unified calendar view of all linked athletes' workouts.
 */
export default function ParentCalendarScreen() {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      flex={1}
      bg="$background"
      items="center"
      justify="center"
      gap="$6"
      px="$6"
      pt={insets.top}
      pb={insets.bottom}
    >
      {/* Icon */}
      <YStack bg="$brand2" p="$5" rounded="$10">
        <CalendarIcon size={48} color="$primary" />
      </YStack>

      {/* Content */}
      <YStack gap="$3" items="center">
        <DisplayHeading>FAMILY CALENDAR</DisplayHeading>
        <Subtitle>
          View all your athletes' training schedules in one place.
        </Subtitle>
      </YStack>

      {/* Coming Soon Card */}
      <Card p="$4" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
        <YStack gap="$2" items="center">
          <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color11">
            Coming Soon
          </Text>
          <Text fontSize={13} fontFamily="$body" color="$color10" text="center">
            The family calendar will be available once you've linked athletes to your account.
          </Text>
        </YStack>
      </Card>
    </YStack>
  )
}
