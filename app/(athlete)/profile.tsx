import { useRef, useState } from 'react'
import { YStack, Text, ScrollView, Spinner, useThemeName } from 'tamagui'
import { useQuery } from 'convex/react'
import { useIsFocused, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { OneRepMaxSheet } from '../../components/OneRepMaxSheet'
import { SentryDiagnosticsCard } from '../../components/SentryDiagnosticsCard'
import { ReplayExcludedSurface } from '../../components/ReplayExcludedSurface'
import { RatingFeedbackSheet, BugReportSheet, FeatureRequestSheet } from '../../components/feedback'
import { ProfileHeader } from '../../components/profile/ProfileHeader'
import { MaxTiles, MAX_TILES_OVERLAP } from '../../components/profile/MaxTiles'
import { SettingsGroup } from '../../components/settings/SettingsGroup'
import { SettingsRow } from '../../components/settings/SettingsRow'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings, Lightbulb, Star, Bug, Sparkles } from '@tamagui/lucide-icons'
import { experienceLabel, trainingDaysLabel } from '../../lib/profile'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const isFocused = useIsFocused()
  const darkTheme = useThemeName().startsWith('dark')
  // Whether the navy header is still under the status bar
  const [overHeader, setOverHeader] = useState(true)
  const headerHeight = useRef(Number.POSITIVE_INFINITY)

  // Sheet state for editing 1RM
  const [maxSheetOpen, setMaxSheetOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<{
    _id: string
    name: string
    slug: string
    currentMax: number | null
  } | null>(null)

  // Feedback sheets (submit + toast only; no in-app history list)
  const [ratingSheetOpen, setRatingSheetOpen] = useState(false)
  const [bugSheetOpen, setBugSheetOpen] = useState(false)
  const [featureSheetOpen, setFeatureSheetOpen] = useState(false)

  const programState = useQuery(api.userPrograms.getCurrentProgramState, user ? {} : 'skip')

  const intakeHistory = useQuery(api.userPrograms.getIntakeHistory, user ? {} : 'skip')

  // Core lift exercises with user's maxes
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises, user ? {} : 'skip')

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primaryText" />
        <Text color="$color10" fontFamily="$body">
          Loading profile...
        </Text>
      </YStack>
    )
  }

  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text fontFamily="$body">Error loading profile</Text>
        <SignOutButton />
      </YStack>
    )
  }

  const latestIntake = intakeHistory?.[0]

  // No program, no maxes card: the header has no phase track to sit under
  const hasMaxes =
    Boolean(programState) && coreLiftExercises !== undefined && coreLiftExercises.length > 0

  return (
    <ReplayExcludedSurface>
      {/* The header is navy in both themes, so the clock and battery go light while it is under them */}
      {isFocused ? <StatusBar style={overHeader || darkTheme ? 'light' : 'dark'} /> : null}
      <YStack flex={1} bg="$background">
        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          testID="profile-scroll"
          onScroll={(event) => {
            // The status bar sits over the top inset. Once the header has scrolled
            // out from under it, the page behind is light again.
            const next = event.nativeEvent.contentOffset.y < headerHeight.current - insets.top
            if (next !== overHeader) setOverHeader(next)
          }}
        >
          <ProfileHeader
            onHeight={(height) => {
              headerHeight.current = height
            }}
            name={user.name}
            topInset={insets.top}
            overlap={hasMaxes ? MAX_TILES_OVERLAP : 0}
            program={programState}
          />

          <YStack
            gap="$5"
            px="$4"
            pt={hasMaxes ? 0 : '$5'}
            pb={insets.bottom + 100}
            maxW={800}
            width="100%"
            self="center"
          >
            {hasMaxes ? (
              <MaxTiles
                lifts={coreLiftExercises}
                onPress={(slug) => {
                  const exercise = coreLiftExercises.find((lift) => lift.slug === slug)
                  if (!exercise) return
                  setSelectedExercise({
                    _id: exercise._id,
                    name: exercise.name,
                    slug: exercise.slug,
                    currentMax: exercise.currentMax,
                  })
                  setMaxSheetOpen(true)
                }}
              />
            ) : null}

            {/* Baseline facts, as words. The header already says sport, level, phase and week */}
            <SettingsGroup label="Training info">
              {programState?.categoryName ? (
                <SettingsRow label="GPP category" value={programState.categoryName} />
              ) : null}
              {latestIntake ? (
                <SettingsRow
                  label="Training days"
                  value={trainingDaysLabel(latestIntake.preferredTrainingDaysPerWeek)}
                />
              ) : null}
              {latestIntake ? (
                <SettingsRow
                  label="Experience"
                  value={experienceLabel(latestIntake.yearsOfExperience)}
                />
              ) : null}
              {latestIntake ? (
                <SettingsRow
                  label="Last assessment"
                  valueNumeric
                  value={new Date(latestIntake.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                />
              ) : null}
              {/* On its own line: an address has no spaces to wrap at beside a label */}
              <SettingsRow label="Email" supporting={user.email} />
            </SettingsGroup>

            <SettingsGroup label="Learn">
              <SettingsRow
                icon={Lightbulb}
                label="Training Science"
                supporting="Understand your program"
                onPress={() => {
                  router.push('/(athlete)/training-science' as any)
                }}
              />
            </SettingsGroup>

            {/* Submit + confirmation toast only */}
            <SettingsGroup label="Feedback & support">
              <SettingsRow
                icon={Star}
                label="Rate WanderFit"
                supporting="Share a quick private rating"
                onPress={() => setRatingSheetOpen(true)}
                testID="feedback-row-rate"
                nameFromContent
              />
              <SettingsRow
                icon={Bug}
                label="Report a bug"
                supporting="Flag something broken or off"
                onPress={() => setBugSheetOpen(true)}
                testID="feedback-row-bug"
                nameFromContent
              />
              <SettingsRow
                icon={Sparkles}
                label="Request a feature"
                supporting="Suggest an improvement"
                onPress={() => setFeatureSheetOpen(true)}
                testID="feedback-row-feature"
                nameFromContent
              />
            </SettingsGroup>

            <YStack gap="$3">
              <SettingsGroup label="Settings">
                <SettingsRow
                  icon={Settings}
                  label="App settings"
                  onPress={() => {
                    router.push('/(athlete)/settings')
                  }}
                  testID="profile-app-settings"
                  nameFromContent
                />
              </SettingsGroup>

              <SentryDiagnosticsCard />
            </YStack>

            {/* Sign Out */}
            <YStack pt="$2">
              <SignOutButton />
            </YStack>
          </YStack>
        </ScrollView>

        {/* 1RM Edit Sheet */}
        {selectedExercise && (
          <OneRepMaxSheet
            open={maxSheetOpen}
            onOpenChange={setMaxSheetOpen}
            mode="single"
            exercise={selectedExercise}
            onComplete={() => setSelectedExercise(null)}
          />
        )}

        {/* Feedback Sheets (submit + confirmation toast only) */}
        {ratingSheetOpen ? (
          <RatingFeedbackSheet
            open={ratingSheetOpen}
            onOpenChange={setRatingSheetOpen}
            trigger="profile_manual"
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}

        {bugSheetOpen ? (
          <BugReportSheet
            open={bugSheetOpen}
            onOpenChange={setBugSheetOpen}
            source="profile"
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}

        {featureSheetOpen ? (
          <FeatureRequestSheet
            open={featureSheetOpen}
            onOpenChange={setFeatureSheetOpen}
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}
      </YStack>
    </ReplayExcludedSurface>
  )
}
