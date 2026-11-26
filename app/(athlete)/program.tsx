import { YStack, Text, Spinner, Theme } from 'tamagui'
import { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuth } from '../../hooks/useAuth'
import { WorkoutCalendar } from '../../components/calendar'
import { ProgramSeasonHeader } from '../../components/program/ProgramSeasonHeader'
import type { Id } from 'convex/_generated/dataModel'
import { useSportScheme } from '../../hooks/useSportScheme'
import { sportTheme } from '../../lib/sportTokens'
import { renderOriginalPlay } from '../../lib/originalPlay'
import type { SportThemeName } from '../../lib/sportTamaguiTheme'

/**
 * The board behind Program: the play already drawn on the board ground, the
 * marker's three paths at rest. It never animates, and it carries no athlete
 * and no score. It sits under the header and the calendar and takes no touches.
 */
export function ProgramBoard({ scheme }: { scheme: SportThemeName }) {
  const xml = useMemo(() => renderOriginalPlay(scheme, 'long'), [scheme])
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="program-board"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
    </View>
  )
}

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
 * - Phases as words (Build, Train, Sharpen); no phase colours
 * - Progress tracking with completion status
 *
 * UX Model: "Start = Swap"
 * - Tapping a workout navigates to workout details
 * - Starting a workout auto-cascades the schedule if needed
 * - Drag-drop for manual schedule adjustments (future)
 */
export default function ProgramPage() {
  // Program is the board (issue #209): the sport theme for words and buttons,
  // and its own ground, the board surface, under the drawn play. The theme's
  // background stays the instrument ground for everything else.
  const scheme = useSportScheme()
  const board = sportTheme('basketball', scheme).boardSurface.hex
  return (
    <Theme name={scheme}>
      <YStack flex={1} style={{ backgroundColor: board }} testID="program-screen">
        <ProgramBoard scheme={scheme} />
        <ProgramContent />
      </YStack>
    </Theme>
  )
}

function ProgramContent() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // Set once, by the First Run's save: the first visit to the saved plan.
  const { welcome, kept, next } = useLocalSearchParams<{ welcome?: string; kept?: string; next?: string }>()
  // One visit only: leaving the tab clears them, so a later "Up next" never
  // keeps the first day's label.
  useFocusEffect(
    useCallback(() => {
      if (!welcome) return
      return () => router.setParams({ welcome: undefined, kept: undefined, next: undefined })
    }, [welcome, router])
  )

  // Handle workout press - navigate to workout details
  const handleWorkoutPress = (templateId: string) => {
    router.push(`/(athlete)/workout/${templateId as Id<'program_templates'>}`)
  }

  // Loading state while auth is resolving
  if (authLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Spinner size="large" color="$color" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Text color="$color11">Please sign in to view your program.</Text>
      </YStack>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YStack
        flex={1}
        pt={insets.top + 16}
        pb={insets.bottom}
      >
        <ProgramSeasonHeader welcome={welcome === '1'} kept={kept === '1'} next={next} />
        <WorkoutCalendar
          onWorkoutPress={handleWorkoutPress}
          initialViewMode="week"
        />
      </YStack>
    </GestureHandlerRootView>
  )
}
