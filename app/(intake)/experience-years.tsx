import { useState } from 'react'
import { YStack, XStack, Text, Button, styled } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Minus, Plus, Trophy } from '@tamagui/lucide-icons'
import { Vibration, Animated } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'
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

// Skill level styling based on years
const SKILL_STYLES = {
  Novice: {
    color: '$blue11',
    label: 'Novice',
    description: 'Building your foundation',
  },
  Moderate: {
    color: '$orange11',
    label: 'Intermediate',
    description: 'Developing your skills',
  },
  Advanced: {
    color: '$primary',
    label: 'Advanced',
    description: 'Refining your expertise',
  },
} as const

// Special styling for 10+ years (veteran status)
const VETERAN_STYLE = {
  color: '$yellow10',
  label: 'Veteran',
  description: 'A decade of dedication',
}

// Trophy styling based on year index (0-9)
// Earlier years = smaller/duller, later years = bigger/shinier
function getTrophyStyle(yearIndex: number): { size: number; color: string } {
  // Size progression: starts at 20, grows to 28 for year 10
  const baseSize = 18
  const sizeIncrement = 1
  const size = baseSize + (yearIndex * sizeIncrement)

  // Color progression based on milestone years
  if (yearIndex >= 9) {
    // Year 10: Gold champion
    return { size: 28, color: '$yellow10' }
  } else if (yearIndex >= 6) {
    // Years 7-9: Gold
    return { size, color: '$yellow9' }
  } else if (yearIndex >= 3) {
    // Years 4-6: Orange/Bronze
    return { size, color: '$orange9' }
  } else {
    // Years 1-3: Silver/Gray
    return { size, color: '$color9' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TrophyCase Component (1 trophy per year)
// ─────────────────────────────────────────────────────────────────────────────

interface TrophyCaseProps {
  years: number
}

const TrophyCase = ({ years }: TrophyCaseProps) => {
  // Empty state
  if (years === 0) {
    return (
      <YStack
        height={100}
        width="100%"
        items="center"
        justify="center"
        bg="$color2"
        rounded="$4"
        borderWidth={2}
        borderColor="$color4"
        borderStyle="dashed"
      >
        <Text color="$color8" fontFamily="$body" fontSize={14}>
          Your trophy case awaits
        </Text>
      </YStack>
    )
  }

  // Generate one trophy per year
  const trophies = Array.from({ length: years }, (_, i) => getTrophyStyle(i))

  return (
    <YStack
      width="100%"
      bg="$color2"
      rounded="$4"
      p="$4"
      borderWidth={1}
      borderColor="$color5"
    >
      {/* Shelf */}
      <YStack
        minHeight={70}
        items="center"
        justify="flex-end"
      >
        {/* Trophies on shelf - wrap if needed */}
        <XStack
          gap="$2"
          items="flex-end"
          justify="center"
          flexWrap="wrap"
          pb="$2"
          px="$2"
        >
          {trophies.map((trophy, index) => (
            <YStack
              key={index}
              items="center"
              animation="bouncy"
              enterStyle={{ opacity: 0, scale: 0.5, y: 15 }}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Trophy
                size={trophy.size}
                color={trophy.color as any}
              />
            </YStack>
          ))}
        </XStack>

        {/* Shelf line */}
        <YStack
          width="100%"
          height={4}
          bg="$color6"
          rounded="$2"
        />
      </YStack>

      {/* Shelf label for milestones */}
      {years >= 10 && (
        <XStack justify="center" mt="$2">
          <YStack bg="$yellow4" px="$3" py="$1" rounded="$2">
            <Text fontSize={11} color="$yellow11" fontWeight="700" letterSpacing={1}>
              DECADE CLUB
            </Text>
          </YStack>
        </XStack>
      )}
    </YStack>
  )
}

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

  // Swipe navigation - only backward (right swipe), forward requires Continue button
  const { panHandlers, translateX } = useSwipeNavigation({
    onSwipeRight: () => router.back(),
    canSwipeRight: true,
    canSwipeLeft: false,
  })

  // Redirect if missing params
  if (!sportId || !ageGroup) {
    router.replace('/(intake)/sport')
    return null
  }

  // Use veteran style for 10+ years, otherwise use skill level
  const isVeteran = years >= 10
  const skillLevel = getSkillLevel(years)
  const skillStyle = isVeteran ? VETERAN_STYLE : SKILL_STYLES[skillLevel]

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

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, ageGroup },
      } as any)
    }
  }

  return (
    <Animated.View
      {...panHandlers}
      style={{ flex: 1, transform: [{ translateX }] }}
    >
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
          <IntakeProgressDots
            total={COMBINED_FLOW_SCREEN_COUNT}
            current={COMBINED_FLOW_SCREENS.EXPERIENCE_YEARS}
            onNavigate={handleProgressNavigate}
          />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>YOUR EXPERIENCE</DisplayHeading>
          <Subtitle>
            How long have you been training{'\n'}for your sport?
          </Subtitle>
        </YStack>

        {/* Main Experience Display */}
        <YStack flex={1} items="center" justify="center" gap="$5">
          {/* Large Year Counter with skill level color */}
          <YStack items="center" gap="$1">
            <Text
              fontSize={isVeteran ? 80 : 100}
              fontFamily="$heading"
              fontWeight="800"
              color={skillStyle.color}
              lineHeight={isVeteran ? 80 : 100}
            >
              {isVeteran ? '10+' : years}
            </Text>
            <Text
              fontSize={18}
              fontFamily="$body"
              fontWeight="600"
              color="$color10"
              textTransform="uppercase"
              letterSpacing={2}
            >
              {years === 1 ? 'Year' : 'Years'}
            </Text>
          </YStack>

          {/* Trophy Case Display */}
          <TrophyCase years={years} />

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
          <XStack items="center" justify="center" gap="$6" mt="$2">
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
    </Animated.View>
  )
}
