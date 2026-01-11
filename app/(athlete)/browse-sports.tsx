import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Id } from '../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
} from '@tamagui/lucide-icons'
import { SportPreviewCard, WorkoutPreviewCard } from '../../components/athlete/SportPreviewCard'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const PageTitle = styled(Text, {
  fontFamily: '$heading',
  fontSize: 24,
  letterSpacing: 0.5,
  color: '$color12',
})

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'preview'

export default function BrowseSportsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedSportId, setSelectedSportId] = useState<Id<'sports'> | null>(null)
  const [previewPhase, setPreviewPhase] = useState<'GPP' | 'SPP' | 'SSP'>('GPP')
  const [previewWeek, setPreviewWeek] = useState(1)

  // Get browsable sports
  const browsableSports = useQuery(api.sports.getBrowsableSports)

  // Get preview workouts for selected sport
  const previewData = useQuery(
    api.sports.getPreviewWorkouts,
    selectedSportId
      ? { sportId: selectedSportId, phase: previewPhase, week: previewWeek }
      : 'skip'
  )

  // Handle sport selection
  const handleSportPress = (sportId: Id<'sports'>) => {
    setSelectedSportId(sportId)
    setPreviewPhase('GPP')
    setPreviewWeek(1)
    setViewMode('preview')
  }

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list')
    setSelectedSportId(null)
  }

  // Phase navigation
  const phases: Array<'GPP' | 'SPP' | 'SSP'> = ['GPP', 'SPP', 'SSP']
  const currentPhaseIndex = phases.indexOf(previewPhase)

  const navigatePhase = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPhaseIndex > 0) {
      setPreviewPhase(phases[currentPhaseIndex - 1])
      setPreviewWeek(1)
    } else if (direction === 'next' && currentPhaseIndex < phases.length - 1) {
      setPreviewPhase(phases[currentPhaseIndex + 1])
      setPreviewWeek(1)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && previewWeek > 1) {
      setPreviewWeek(previewWeek - 1)
    } else if (direction === 'next' && previewWeek < 4) {
      setPreviewWeek(previewWeek + 1)
    }
  }

  // Loading state
  if (browsableSports === undefined) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
          <Spinner size="large" color="$primary" />
          <Text color="$color10" fontFamily="$body">
            Loading sports...
          </Text>
        </YStack>
      </>
    )
  }

  // Preview Mode View
  if (viewMode === 'preview' && selectedSportId) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: previewData?.sportName ?? 'Preview',
            headerLeft: () => (
              <Button
                size="$3"
                bg="transparent"
                onPress={handleBackToList}
                icon={ArrowLeft}
                circular
              />
            ),
          }}
        />

        <YStack flex={1} bg="$background">
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <YStack
              gap="$4"
              px="$4"
              pt="$4"
              pb={insets.bottom + 40}
              maxW={600}
              width="100%"
              self="center"
            >
              {/* Preview Mode Banner */}
              <Card p="$3" bg="$yellow2" borderColor="$yellow6" borderWidth={1} rounded="$3">
                <XStack items="center" gap="$2">
                  <Eye size={16} color="$yellow10" />
                  <Text fontSize={13} fontFamily="$body" color="$yellow11">
                    Preview Mode - View only, workouts cannot be started
                  </Text>
                </XStack>
              </Card>

              {/* Phase & Week Navigation */}
              <Card p="$4" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
                <YStack gap="$3">
                  {/* Phase Selector */}
                  <XStack items="center" justify="space-between">
                    <Button
                      size="$3"
                      bg="transparent"
                      icon={ChevronLeft}
                      onPress={() => navigatePhase('prev')}
                      disabled={currentPhaseIndex === 0}
                      opacity={currentPhaseIndex === 0 ? 0.3 : 1}
                      circular
                    />
                    <YStack items="center">
                      <Text fontSize={16} fontFamily="$body" fontWeight="600" color="$color12">
                        {PHASE_NAMES[previewPhase]}
                      </Text>
                      <Text fontSize={11} fontFamily="$body" color="$color10">
                        Phase {currentPhaseIndex + 1} of 3
                      </Text>
                    </YStack>
                    <Button
                      size="$3"
                      bg="transparent"
                      icon={ChevronRight}
                      onPress={() => navigatePhase('next')}
                      disabled={currentPhaseIndex === phases.length - 1}
                      opacity={currentPhaseIndex === phases.length - 1 ? 0.3 : 1}
                      circular
                    />
                  </XStack>

                  {/* Week Selector */}
                  <XStack items="center" justify="space-between" bg="$color3" p="$2" rounded="$3">
                    <Button
                      size="$2"
                      bg="transparent"
                      icon={ChevronLeft}
                      onPress={() => navigateWeek('prev')}
                      disabled={previewWeek === 1}
                      opacity={previewWeek === 1 ? 0.3 : 1}
                      circular
                    />
                    <Text fontSize={14} fontFamily="$body" fontWeight="500" color="$color11">
                      Week {previewWeek}
                    </Text>
                    <Button
                      size="$2"
                      bg="transparent"
                      icon={ChevronRight}
                      onPress={() => navigateWeek('next')}
                      disabled={previewWeek === 4}
                      opacity={previewWeek === 4 ? 0.3 : 1}
                      circular
                    />
                  </XStack>
                </YStack>
              </Card>

              {/* Workouts Preview */}
              {previewData === undefined ? (
                <YStack items="center" py="$6">
                  <Spinner size="small" color="$primary" />
                </YStack>
              ) : previewData.error ? (
                <Card p="$4" bg="$red2" borderColor="$red6" borderWidth={1} rounded="$4">
                  <Text fontSize={14} fontFamily="$body" color="$red11">
                    {previewData.error}
                  </Text>
                </Card>
              ) : previewData.workouts.length === 0 ? (
                <Card p="$4" bg="$color3" rounded="$4">
                  <Text fontSize={14} fontFamily="$body" color="$color10" text="center">
                    No workouts available for this week
                  </Text>
                </Card>
              ) : (
                <YStack gap="$3">
                  <SectionLabel>WORKOUTS THIS WEEK</SectionLabel>
                  {previewData.workouts.map((workout: any) => (
                    <WorkoutPreviewCard
                      key={workout.templateId}
                      day={workout.day}
                      focus={workout.focus}
                      exerciseCount={workout.exerciseCount}
                      exercisePreview={workout.exercisePreview}
                    />
                  ))}
                </YStack>
              )}

              {/* Info Card */}
              <Card p="$4" bg="$color3" rounded="$4">
                <XStack items="flex-start" gap="$2">
                  <Info size={16} color="$color10" mt={2} />
                  <Text fontSize={13} fontFamily="$body" color="$color10" flex={1}>
                    To train for this sport, update your primary sport in settings. Preview mode
                    lets you explore what training looks like without changing your current program.
                  </Text>
                </XStack>
              </Card>
            </YStack>
          </ScrollView>
        </YStack>
      </>
    )
  }

  // List View
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Browse Sports',
          headerLeft: () => (
            <Button
              size="$3"
              bg="transparent"
              onPress={() => router.back()}
              icon={ArrowLeft}
              circular
            />
          ),
        }}
      />

      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$5"
            px="$4"
            pt="$4"
            pb={insets.bottom + 40}
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Header */}
            <YStack gap="$2">
              <PageTitle>Explore Your Sports</PageTitle>
              <Text fontSize={14} fontFamily="$body" color="$color10">
                Preview training programs for your additional sports
              </Text>
            </YStack>

            {/* Sports List */}
            {browsableSports && browsableSports.length > 0 ? (
              <YStack gap="$3">
                <SectionLabel>YOUR ADDITIONAL SPORTS</SectionLabel>
                {browsableSports.map((sport: any) => (
                  <SportPreviewCard
                    key={sport.sportId}
                    sportName={sport.sportName}
                    categoryName={sport.categoryName}
                    categoryShortName={sport.categoryShortName}
                    description={sport.description}
                    onPress={() => handleSportPress(sport.sportId)}
                  />
                ))}
              </YStack>
            ) : (
              <Card p="$5" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
                <YStack gap="$3" items="center">
                  <YStack bg="$color4" p="$3" rounded="$10">
                    <Eye size={24} color="$color10" />
                  </YStack>
                  <Text fontSize={14} fontFamily="$body" color="$color10" text="center">
                    No additional sports to browse
                  </Text>
                  <Text fontSize={12} fontFamily="$body" color="$color9" text="center">
                    Add more sports during intake to explore their training programs here
                  </Text>
                </YStack>
              </Card>
            )}

            {/* About Preview Mode */}
            <Card p="$4" bg="$brand1" borderColor="$primary" borderWidth={1} rounded="$4">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Eye size={16} color="$primary" />
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$primary">
                    About Preview Mode
                  </Text>
                </XStack>
                <Text fontSize={13} fontFamily="$body" color="$color11">
                  Preview mode lets you explore workout programs for sports you're interested in
                  without changing your current training focus. See exercises, sets, and reps - but
                  workouts can only be started for your primary sport.
                </Text>
              </YStack>
            </Card>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
