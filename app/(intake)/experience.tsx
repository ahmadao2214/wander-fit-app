import { useState } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Slider, Spinner } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  ChevronRight,
  ChevronLeft,
  TrendingUp,
} from '@tamagui/lucide-icons'
import { getSkillLevel, getExperienceSliderColor } from '../../lib'
import type { AgeGroup } from '../../types'

/**
 * Experience & Training Days Screen
 *
 * Step 2 of intake flow.
 * Collects years of sport-specific experience and preferred training days.
 */
export default function ExperienceScreen() {
  const router = useRouter()
  const { sportId } = useLocalSearchParams() as { sportId: string }

  const [yearsOfExperience, setYearsOfExperience] = useState(1)
  const [trainingDays, setTrainingDays] = useState(3)
  const [weeksUntilSeason, setWeeksUntilSeason] = useState(8)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('18+')
  const [scrollEnabled, setScrollEnabled] = useState(true)

  // Fetch sport details to display sport name
  const sport = useQuery(
    api.sports.getById,
    sportId ? { sportId: sportId as Id<"sports"> } : "skip"
  )

  // Redirect back if no sport selected
  if (!sportId) {
    router.replace('/(intake)/sport')
    return null
  }

  // Show loading while fetching sport (undefined = still loading)
  if (sport === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // Handle sport not found (null = query completed but no document)
  if (sport === null) {
    router.replace('/(intake)/sport')
    return null
  }

  const handleContinue = () => {
    router.push({
      pathname: '/(intake)/results',
      params: {
        sportId,
        yearsOfExperience: yearsOfExperience.toString(),
        trainingDays: trainingDays.toString(),
        weeksUntilSeason: weeksUntilSeason.toString(),
        ageGroup,
      },
    })
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} scrollEnabled={scrollEnabled}>
        <YStack
          gap="$6"
          px="$4"
          pt="$10"
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <YStack gap="$2" items="center">
            <TrendingUp size={48} color="$primary" />
            <H2>Build Your Program</H2>
            <Text color="$color11" fontSize="$4" text="center">
              Help us personalize your training based on your experience and goals
            </Text>
          </YStack>

          {/* Years of Experience */}
          <Card p="$5" borderColor={"$gray6" as any} borderWidth={1}>
            <YStack gap="$4">
              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  {sport.name} Experience
                </Text>
                <Text fontSize="$3" color="$color10">
                  How long have you been playing {sport.name}?
                </Text>
              </YStack>

              <YStack gap="$3" items="center">
                <Text fontSize="$8" fontWeight="700" color={getExperienceSliderColor(yearsOfExperience)}>
                  {yearsOfExperience >= 10 ? '10+' : yearsOfExperience} {yearsOfExperience === 1 ? 'year' : 'years'}
                </Text>

                <YStack
                  width="100%"
                  py="$3"
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={() => setScrollEnabled(false)}
                  onResponderRelease={() => setScrollEnabled(true)}
                >
                  <Slider
                    value={[yearsOfExperience]}
                    onValueChange={(val) => setYearsOfExperience(val[0])}
                    min={0}
                    max={10}
                    step={1}
                    width="100%"
                  >
                    <Slider.Track bg={"$gray5" as any} height={10} rounded={5}>
                      <Slider.TrackActive bg={getExperienceSliderColor(yearsOfExperience)} />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      size={32}
                      bg={getExperienceSliderColor(yearsOfExperience)}
                      borderWidth={4}
                      borderColor="white"
                      circular
                      elevate
                      shadowColor="rgba(0,0,0,0.3)"
                      shadowOffset={{ width: 0, height: 2 }}
                      shadowRadius={4}
                    />
                  </Slider>
                </YStack>

                <XStack width="100%" justify="space-between">
                  <Text fontSize="$2" color="$color9">Beginner</Text>
                  <Text fontSize="$2" color="$color9">10+ years</Text>
                </XStack>
              </YStack>

              {/* Skill Level Preview */}
              <Card bg={yearsOfExperience <= 3 ? '$intensityLow1' : yearsOfExperience <= 6 ? '$intensityMed1' : '$intensityHigh1'} p="$3" rounded="$3">
                <XStack items="center" gap="$2">
                  <Text fontSize="$3" color={yearsOfExperience <= 3 ? '$intensityLow11' : yearsOfExperience <= 6 ? '$intensityMed11' : '$intensityHigh11'}>
                    Skill Level:
                  </Text>
                  <Text fontSize="$3" fontWeight="700" color={yearsOfExperience <= 3 ? '$intensityLow11' : yearsOfExperience <= 6 ? '$intensityMed11' : '$intensityHigh11'}>
                    {getSkillLevel(yearsOfExperience)}
                  </Text>
                </XStack>
              </Card>
            </YStack>
          </Card>

          {/* Age Group */}
          <Card p="$5" borderColor={"$gray6" as any} borderWidth={1}>
            <YStack gap="$4">
              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  Age Group
                </Text>
                <Text fontSize="$3" color="$color10">
                  Select your age range for appropriate training intensity
                </Text>
              </YStack>

              <XStack gap="$2.5" justify="center" width="100%">
                {(['10-13', '14-17', '18+'] as const).map((age) => (
                  <Button
                    key={age}
                    size="$4"
                    flex={1}
                    bg={ageGroup === age ? '$primary' : '$gray3'}
                    color={ageGroup === age ? 'white' : '$color11'}
                    onPress={() => setAgeGroup(age)}
                    fontWeight="600"
                    pressStyle={{ scale: 0.95 }}
                    fontFamily="$body"
                  >
                    <Text color={ageGroup === age ? 'white' : '$color11'} fontWeight="600" fontSize="$4">
                      {age}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </YStack>
          </Card>

          {/* Training Days */}
          <Card p="$5" borderColor={"$gray6" as any} borderWidth={1}>
            <YStack gap="$4">
              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  Training Commitment
                </Text>
                <Text fontSize="$3" color="$color10">
                  How many times per week can you commit to training?
                </Text>
              </YStack>

              <YStack gap="$3" items="center">
                <Text fontSize="$8" fontWeight="700" color="$primary">
                  {trainingDays} days/week
                </Text>

                <XStack gap="$2.5" justify="center" width="100%">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <Button
                      key={days}
                      size="$4"
                      flex={1}
                      maxWidth={65}
                      bg={trainingDays === days ? '$primary' : '$gray3'}
                      color={trainingDays === days ? 'white' : '$color11'}
                      onPress={() => setTrainingDays(days)}
                      fontWeight="600"
                      pressStyle={{ scale: 0.95 }}
                      fontFamily="$body"
                    >
                      <Text color={trainingDays === days ? 'white' : '$color11'} fontWeight="600" fontSize="$4">
                        {days}
                      </Text>
                    </Button>
                  ))}
                </XStack>

                <Text fontSize="$2" color="$color9">
                  We recommend 3-4 days for most athletes
                </Text>
              </YStack>
            </YStack>
          </Card>

          {/* Weeks Until Season */}
          <Card p="$5" borderColor={"$gray6" as any} borderWidth={1}>
            <YStack gap="$4">
              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  Season Timeline
                </Text>
                <Text fontSize="$3" color="$color10">
                  How many weeks until your upcoming season?
                </Text>
              </YStack>

              <YStack gap="$3" items="center">
                <Text fontSize="$8" fontWeight="700" color="$orange10">
                  {weeksUntilSeason >= 16 ? '16+' : weeksUntilSeason} weeks
                </Text>

                <YStack
                  width="100%"
                  py="$3"
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={() => setScrollEnabled(false)}
                  onResponderRelease={() => setScrollEnabled(true)}
                >
                  <Slider
                    value={[weeksUntilSeason]}
                    onValueChange={(val) => setWeeksUntilSeason(val[0])}
                    min={1}
                    max={16}
                    step={1}
                    width="100%"
                  >
                    <Slider.Track bg={"$gray5" as any} height={10} rounded={5}>
                      <Slider.TrackActive bg="$orange9" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      size={32}
                      bg="$orange9"
                      borderWidth={4}
                      borderColor="white"
                      circular
                      elevate
                      shadowColor="rgba(0,0,0,0.3)"
                      shadowOffset={{ width: 0, height: 2 }}
                      shadowRadius={4}
                    />
                  </Slider>
                </YStack>

                <XStack width="100%" justify="space-between">
                  <Text fontSize="$2" color="$color9">1 week</Text>
                  <Text fontSize="$2" color="$color9">16+ weeks</Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        borderTopWidth={1}
        borderTopColor={"$gray5" as any}
        bg="$background"
      >
        <XStack gap="$3">
          <Button
            flex={1}
            size="$5"
            variant="outlined"
            onPress={handleBack}
            icon={ChevronLeft}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg="$primary"
            color="white"
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontWeight="700"
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}

