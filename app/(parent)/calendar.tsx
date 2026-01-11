import { useState } from 'react'
import { YStack, Text, Spinner, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FamilyCalendar } from '../../components/parent/FamilyCalendar'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const PageTitle = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 1,
  color: '$color12',
})

const Subtitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 14,
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Family Calendar Screen
 *
 * Shows unified calendar view of all linked athletes' workouts.
 * Parents can see at a glance what each athlete is scheduled to do.
 */
export default function ParentCalendarScreen() {
  const insets = useSafeAreaInsets()
  const [weekOffset, setWeekOffset] = useState(0)

  // Fetch family calendar data
  const calendarData = useQuery(api.parentRelationships.getFamilyCalendar, {
    weekOffset,
  })

  // Loading state
  if (calendarData === undefined) {
    return (
      <YStack
        flex={1}
        bg="$background"
        items="center"
        justify="center"
        gap="$4"
        pt={insets.top}
        pb={insets.bottom}
      >
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading calendar...
        </Text>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16} px="$4" pb={insets.bottom}>
      {/* Header */}
      <YStack gap="$1" mb="$4">
        <PageTitle>FAMILY CALENDAR</PageTitle>
        <Subtitle>
          View all your athletes' training schedules in one place
        </Subtitle>
      </YStack>

      {/* Calendar */}
      <FamilyCalendar
        athletes={calendarData?.athletes || []}
        weekStart={calendarData?.weekStart || Date.now()}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
      />
    </YStack>
  )
}
