import { useState } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Slider } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { 
  ChevronRight,
  ChevronLeft,
  Calendar,
  TrendingUp,
} from '@tamagui/lucide-icons'

/**
 * Experience & Training Days Screen
 * 
 * Step 2 of intake flow.
 * Collects years of experience and preferred training days.
 */
export default function ExperienceScreen() {
  const router = useRouter()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()
  
  const [yearsOfExperience, setYearsOfExperience] = useState(1)
  const [trainingDays, setTrainingDays] = useState(3)

  // Redirect back if no sport selected
  if (!sportId) {
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
      },
    })
  }

  const handleBack = () => {
    router.back()
  }

  // Calculate skill level preview
  const getSkillLevelPreview = () => {
    if (yearsOfExperience < 1) return 'Novice'
    if (yearsOfExperience < 3) return 'Moderate'
    return 'Advanced'
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
            <H2>Your Experience</H2>
            <Text color="$color11" fontSize="$4">
              Tell us about your training background
            </Text>
          </YStack>

          {/* Years of Experience */}
          <Card p="$5" borderColor={"$gray6" as any} borderWidth={1}>
            <YStack gap="$4">
              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  Training Experience
                </Text>
                <Text fontSize="$3" color="$color10">
                  How many years have you been training?
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
                    <Slider.Track bg={"$gray5" as any} height={8} borderRadius={4}>
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
              <Card bg="$green2" p="$3" borderRadius="$3">
                <XStack items="center" gap="$2">
                  <Text fontSize="$3" color="$green11">
                    Skill Level:
                  </Text>
                  <Text fontSize="$3" fontWeight="700" color="$green11">
                    {getSkillLevelPreview()}
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
                  Training Schedule
                </Text>
                <Text fontSize="$3" color="$color10">
                  How many days per week do you want to train?
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

          {/* Info Card */}
          <Card p="$4" bg="$blue2" borderColor="$blue6">
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$blue11">
                Why does this matter?
              </Text>
              <Text fontSize="$3" color="$blue11">
                Your experience level determines the intensity and complexity of your program.
                Training days help us schedule your workouts appropriately with rest days built in.
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

