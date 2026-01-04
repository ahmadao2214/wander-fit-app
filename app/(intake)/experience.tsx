import { useState } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Slider, Spinner } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { 
  ChevronRight,
  ChevronLeft,
  Calendar,
  TrendingUp,
  Clock,
} from '@tamagui/lucide-icons'
import { getSkillLevel, getTrainingPhase } from '../../lib'

/**
 * Experience & Training Days Screen
 * 
 * Step 2 of intake flow.
 * Collects years of sport-specific experience and preferred training days.
 */
export default function ExperienceScreen() {
  const router = useRouter()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()
  
  const [yearsOfExperience, setYearsOfExperience] = useState(1)
  const [trainingDays, setTrainingDays] = useState(3)
  const [weeksUntilSeason, setWeeksUntilSeason] = useState(8)

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
      },
    })
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
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
            <TrendingUp size={48} color={"$green10" as any} />
            <H2>Your {sport.name} Experience</H2>
            <Text color="$color11" fontSize="$4">
              Tell us about your background in {sport.name}
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
                <Text fontSize="$8" fontWeight="700" color="$green10">
                  {yearsOfExperience >= 10 ? '10+' : yearsOfExperience} {yearsOfExperience === 1 ? 'year' : 'years'}
                </Text>
                
                <XStack width="100%" px="$2">
                  <Slider
                    value={[yearsOfExperience]}
                    onValueChange={(val) => setYearsOfExperience(val[0])}
                    min={0}
                    max={10}
                    step={1}
                    width="100%"
                  >
                    <Slider.Track bg={"$gray5" as any} height={8} rounded={4}>
                      <Slider.TrackActive bg="$green9" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      size={28}
                      bg="$green9"
                      borderWidth={3}
                      borderColor="white"
                      circular
                      elevate
                    />
                  </Slider>
                </XStack>

                <XStack width="100%" justify="space-between" px="$2">
                  <Text fontSize="$2" color="$color9">Beginner</Text>
                  <Text fontSize="$2" color="$color9">10+ years</Text>
                </XStack>
              </YStack>

              {/* Skill Level Preview */}
              <Card bg="$green2" p="$3" rounded="$3">
                <XStack items="center" gap="$2">
                  <Text fontSize="$3" color="$green11">
                    Skill Level:
                  </Text>
                  <Text fontSize="$3" fontWeight="700" color="$green11">
                    {getSkillLevel(yearsOfExperience)}
                  </Text>
                </XStack>
              </Card>
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
                <Text fontSize="$8" fontWeight="700" color="$blue10">
                  {trainingDays} days/week
                </Text>

                <XStack gap="$2" flexWrap="wrap" justify="center">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <Button
                      key={days}
                      size="$4"
                      width={60}
                      bg={(trainingDays === days ? '$blue9' : '$gray3') as any}
                      color={(trainingDays === days ? 'white' : '$color11') as any}
                      onPress={() => setTrainingDays(days)}
                      fontWeight="600"
                    >
                      {days}
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
                <XStack items="center" gap="$2">
                  <Clock size={20} color={"$orange10" as any} />
                  <Text fontSize="$5" fontWeight="600">
                    Season Timeline
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$color10">
                  How many weeks until your upcoming season?
                </Text>
              </YStack>

              <YStack gap="$3" items="center">
                <Text fontSize="$8" fontWeight="700" color="$orange10">
                  {weeksUntilSeason >= 16 ? '16+' : weeksUntilSeason} weeks
                </Text>
                
                <XStack width="100%" px="$2">
                  <Slider
                    value={[weeksUntilSeason]}
                    onValueChange={(val) => setWeeksUntilSeason(val[0])}
                    min={1}
                    max={16}
                    step={1}
                    width="100%"
                  >
                    <Slider.Track bg={"$gray5" as any} height={8} rounded={4}>
                      <Slider.TrackActive bg="$orange9" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      size={28}
                      bg="$orange9"
                      borderWidth={3}
                      borderColor="white"
                      circular
                      elevate
                    />
                  </Slider>
                </XStack>

                <XStack width="100%" justify="space-between" px="$2">
                  <Text fontSize="$2" color="$color9">1 week</Text>
                  <Text fontSize="$2" color="$color9">16+ weeks</Text>
                </XStack>
              </YStack>

              {/* Phase Preview */}
              <Card bg="$orange2" p="$3" rounded="$3">
                <XStack items="center" gap="$2">
                  <Text fontSize="$3" color="$orange11">
                    Training Phase:
                  </Text>
                  <Text fontSize="$3" fontWeight="700" color="$orange11">
                    {getTrainingPhase(weeksUntilSeason)}
                  </Text>
                </XStack>
              </Card>
            </YStack>
          </Card>

          {/* Info Card */}
          <Card p="$4" bg="$blue2" borderColor="$blue6">
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$blue11">
                Why does this matter?
              </Text>
              <Text fontSize="$3" color="$blue11">
                Your {sport.name} experience determines the intensity and complexity of your program.
                Your training commitment helps us schedule workouts with appropriate rest days.
                Your season timeline shapes the training phases — building strength in the off-season and sharpening performance as the season approaches.
              </Text>
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
            bg="$green9"
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

