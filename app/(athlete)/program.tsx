import { YStack, Text, Spinner } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuth } from '../../hooks/useAuth'
import { WorkoutCalendar } from '../../components/calendar'
import type { Id } from 'convex/_generated/dataModel'

/**
 * Program Tab - Workout Calendar View
 *
 * Calendar-based view of the training program.
 * Shows workouts mapped to actual calendar dates.
 *
 * Features:
 * - Week view: 7-day horizontal grid with workout cards
 * - Month view: Full month grid with compact indicators
 * - Navigation between weeks/months
 * - Phase color coding (GPP blue, SPP orange, SSP green)
 * - Progress tracking with completion status
 *
 * UX Model: "Start = Swap"
 * - Tapping a workout navigates to workout details
 * - Starting a workout auto-cascades the schedule if needed
 * - Drag-drop for manual schedule adjustments (future)
 */
export default function ProgramPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Handle workout press - navigate to workout details
  const handleWorkoutPress = (templateId: string) => {
    router.push(`/(athlete)/workout/${templateId as Id<'program_templates'>}`)
  }

  // Loading state while auth is resolving
  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Text color="$color11">Please sign in to view your program.</Text>
      </YStack>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YStack
        flex={1}
        bg="$background"
        pt={insets.top + 16}
        pb={insets.bottom}
      >
        <WorkoutCalendar
          onWorkoutPress={handleWorkoutPress}
          initialViewMode="week"
        />
      </YStack>
    </GestureHandlerRootView>
  )
}
