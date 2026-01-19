import { useState } from 'react'
import { YStack, XStack, Text, Button, styled } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Minus, Plus, Trophy, Award, Medal } from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { getSkillLevel } from '../../lib'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 32,
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
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MIN_YEARS = 0
const MAX_YEARS = 10

// Skill level styling
const SKILL_STYLES = {
  Novice: {
    color: '$blue11',
    label: 'Novice',
    description: 'Building your foundation',
  },
  Moderate: {
    color: '$orange11',
    label: 'Moderate',
    description: 'Developing your skills',
  },
  Advanced: {
    color: '$primary',
    label: 'Advanced',
    description: 'Refining your expertise',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Experience Years Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ExperienceYearsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
  }>()

  const [years, setYears] = useState(0)

  // Redirect if missing params
  if (!sportId || !ageGroup) {
    router.replace('/(intake)/sport')
    return null
  }

  const skillLevel = getSkillLevel(years)
  const skillStyle = SKILL_STYLES[skillLevel]

  // Calculate how many trophies to show (1 per 2 years, max 5)
  const trophyCount = Math.min(Math.ceil(years / 2), 5)

  // Determine trophy types based on years
  const getTrophyIcon = (index: number) => {
    if (years >= 6 && index === 0) return Trophy
    if (years >= 3 && index <= 1) return Award
    return Medal
  }

  const getTrophyColor = (index: number) => {
    if (years >= 6 && index === 0) return '$yellow10'
    if (years >= 3 && index <= 1) return '$orange9'
    return '$color10'
  }

  const handleIncrement = () => {
    if (years < MAX_YEARS) {
      Vibration.vibrate(10)
      setYears((prev) => prev + 1)
    }
  }

  const handleDecrement = () => {
    if (years > MIN_YEARS) {
      Vibration.vibrate(10)
      setYears((prev) => prev - 1)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    router.push({
      pathname: '/(intake)/training-days',
      params: {
        sportId,
        ageGroup,
        yearsOfExperience: years.toString(),
      },
    })
  }

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 16}
        pb="$4"
        maxW={600}
        width="100%"
        self="center"
      >
        {/* Progress Dots */}
        <YStack items="center" mb="$4">
          <IntakeProgressDots total={COMBINED_FLOW_SCREEN_COUNT} current={COMBINED_FLOW_SCREENS.EXPERIENCE_YEARS} />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>YOUR EXPERIENCE</DisplayHeading>
          <Subtitle>
            How long have you been training{'\n'}for your sport?
          </Subtitle>
        </YStack>

        {/* Main Experience Display - Full Width */}
        <YStack flex={1} items="center" justify="center" gap="$6">
          {/* Large Year Counter with skill level color */}
          <YStack items="center" gap="$2">
            <Text
              fontSize={120}
              fontFamily="$heading"
              fontWeight="800"
              color={skillStyle.color}
              lineHeight={120}
            >
              {years}
            </Text>
            <Text
              fontSize={20}
              fontFamily="$body"
              fontWeight="600"
              color="$color10"
              textTransform="uppercase"
              letterSpacing={3}
            >
              {years === 1 ? 'Year' : 'Years'}
            </Text>
          </YStack>

          {/* Trophy Display */}
          <YStack height={60} items="center" justify="center">
            {years === 0 ? (
              <Text color="$color9" fontFamily="$body" fontSize={15}>
                Tap + to add your experience
              </Text>
            ) : (
              <XStack gap="$4" items="flex-end" justify="center">
                {Array.from({ length: trophyCount }, (_, index) => {
                  const Icon = getTrophyIcon(index)
                  const color = getTrophyColor(index)
                  return (
                    <YStack
                      key={index}
                      items="center"
                      animation="bouncy"
                      enterStyle={{ opacity: 0, scale: 0.5, y: 20 }}
                    >
                      <Icon size={36 - index * 3} color={color} />
                    </YStack>
                  )
                })}
              </XStack>
            )}
          </YStack>

          {/* Skill Level Label */}
          <YStack items="center" gap="$1">
            <Text
              fontSize={18}
              fontFamily="$body"
              fontWeight="700"
              color={skillStyle.color}
            >
              {skillStyle.label}
            </Text>
            <Text fontSize={14} color="$color10" fontFamily="$body">
              {skillStyle.description}
            </Text>
          </YStack>

          {/* Stepper Controls */}
          <XStack items="center" justify="center" gap="$6" mt="$4">
            <Button
              circular
              size="$6"
              bg={years <= MIN_YEARS ? '$color4' : '$color6'}
              disabled={years <= MIN_YEARS}
              onPress={handleDecrement}
              pressStyle={{ scale: 0.95 }}
            >
              <Minus
                size={28}
                color={years <= MIN_YEARS ? '$color8' : '$color12'}
              />
            </Button>

            <Button
              circular
              size="$6"
              bg={years >= MAX_YEARS ? '$color4' : '$primary'}
              disabled={years >= MAX_YEARS}
              onPress={handleIncrement}
              pressStyle={{ scale: 0.95 }}
            >
              <Plus
                size={28}
                color={years >= MAX_YEARS ? '$color8' : 'white'}
              />
            </Button>
          </XStack>
        </YStack>
      </YStack>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        <XStack gap="$3">
          <Button
            flex={1}
            size="$5"
            bg="$color4"
            color="$color11"
            onPress={handleBack}
            icon={ChevronLeft}
            fontFamily="$body"
            fontWeight="600"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
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
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
