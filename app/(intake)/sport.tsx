import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, Input, Circle, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { useClerk } from '@clerk/clerk-expo'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Search,
  ChevronRight,
  Target,
  Check,
  LogOut,
} from '@tamagui/lucide-icons'
import { Id } from '../../convex/_generated/dataModel'
import LottieView from 'lottie-react-native'
import { getSportInitials } from '../../lib'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'

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
// Sport Icon Lottie Mapping
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_LOTTIE: Record<string, any> = {
  'Soccer': require('../../assets/lottie/sports/soccer.json'),
}

// ─────────────────────────────────────────────────────────────────────────────
// SportIcon Component
// ─────────────────────────────────────────────────────────────────────────────

interface SportIconProps {
  name: string
  size?: number
  isSelected?: boolean
}

const SportIcon = ({ name, size = 56, isSelected = false }: SportIconProps) => {
  const lottieSource = SPORT_LOTTIE[name]
  
  if (lottieSource) {
    return (
      <Circle 
        size={size} 
        bg={isSelected ? '$brand3' : '$color4'}
        overflow="hidden"
        items="center"
        justify="center"
      >
        <LottieView
          key={isSelected ? 'playing' : 'paused'}
          source={lottieSource}
          autoPlay={isSelected}
          loop={isSelected}
          speed={0.8}
          style={{ width: size * 1.4, height: size * 1.4 }}
        />
      </Circle>
    )
  }

  // Fallback: Extract initials using shared utility
  const initials = getSportInitials(name)

  return (
    <Circle 
      size={size} 
      bg={isSelected ? '$brand3' : '$color4'}
    >
      <Text 
        fontSize={size / 2.5} 
        fontFamily="$body" fontWeight="700"
        color={isSelected ? '$primary' : '$color10'}
      >
        {initials}
      </Text>
    </Circle>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SportTile Component
// ─────────────────────────────────────────────────────────────────────────────

interface SportTileProps {
  sport: {
    _id: Id<"sports">
    name: string
    description?: string
  }
  isSelected: boolean
  onSelect: () => void
}

const SportTile = ({ sport, isSelected, onSelect }: SportTileProps) => {
  return (
    <Card
      width="100%"
      aspectRatio={1}
      bg={isSelected ? '$brand1' : '$surface'}
      borderColor={isSelected ? '$primary' : 'transparent'}
      borderWidth={2}
      rounded="$4"
      pressStyle={{ scale: 0.96, opacity: 0.9 }}
      onPress={onSelect}
      position="relative"
    >
      <YStack 
        flex={1} 
        items="center" 
        justify="center" 
        gap="$2" 
        p="$2"
      >
        <SportIcon 
          name={sport.name} 
          size={44}
          isSelected={isSelected} 
        />
        <Text 
          fontSize={12} 
          fontFamily="$body" fontWeight="600"
          text="center" 
          numberOfLines={2}
          color={isSelected ? '$primary' : '$color12'}
        >
          {sport.name}
        </Text>
      </YStack>
      
      {/* Selected indicator */}
      {isSelected && (
        <Circle
          size={22}
          bg="$primary"
          position="absolute"
          t={6}
          r={6}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </Circle>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport Selection Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SportSelectionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useClerk()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSportId, setSelectedSportId] = useState<Id<"sports"> | null>(null)

  const sports = useQuery(api.sports.list, {})

  // Sign out handler for users who need to start fresh
  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/(auth)/sign-in')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const GAP = 12

  if (!sports) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading sports...
        </Text>
      </YStack>
    )
  }

  const filteredSports = searchQuery
    ? sports.filter((s) => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sports

  const sortedSports = [...filteredSports].sort((a, b) => 
    a.name.localeCompare(b.name)
  )

  const handleContinue = () => {
    if (selectedSportId) {
      // Navigate to onboarding education screens first (why-it-works)
      router.push({
        pathname: '/(onboarding)/why-it-works',
        params: { sportId: selectedSportId },
      } as any)
    }
  }

  // Navigation handler for progress dots (backward navigation only)
  // Sport is the first screen, so no backward navigation is possible
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push(route as any)
    }
  }

  return (
    <YStack flex={1} bg="$background">
      {/* Sign Out Button - positioned in top right */}
      <XStack
        position="absolute"
        top={insets.top + 8}
        right={16}
        zIndex={10}
      >
        <Button
          size="$3"
          chromeless
          onPress={handleSignOut}
          icon={<LogOut size={18} color="$color10" />}
          color="$color10"
        >
          Sign Out
        </Button>
      </XStack>

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          gap="$5"
          px="$4"
          pt={insets.top + 24}
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots */}
          <YStack items="center" mb="$2">
            <IntakeProgressDots
              total={COMBINED_FLOW_SCREEN_COUNT}
              current={COMBINED_FLOW_SCREENS.SPORT}
              onNavigate={handleProgressNavigate}
            />
          </YStack>

          {/* Header */}
          <YStack gap="$3" items="center">
            <YStack bg="$brand2" p="$4" rounded="$10">
              <Target size={40} color="$primary" />
            </YStack>
            <DisplayHeading>WHAT'S YOUR SPORT?</DisplayHeading>
            <Subtitle>
              Select your primary sport to get a personalized training program
            </Subtitle>
          </YStack>

          {/* Search */}
          <XStack
            bg="$surface"
            rounded="$4"
            borderWidth={1}
            borderColor="$borderColor"
            px="$3"
            py="$2.5"
            items="center"
            gap="$2"
          >
            <Search size={20} color="$color10" />
            <Input
              flex={1}
              placeholder="Search sports..."
              placeholderTextColor="$placeholderColor"
              value={searchQuery}
              onChangeText={setSearchQuery}
              bg="transparent"
              borderWidth={0}
              fontSize={15}
              fontFamily="$body"
              p={0}
            />
          </XStack>

          {/* Sport Tiles Grid */}
          <XStack
            width="100%"
            flexWrap="wrap"
            justifyContent="space-between"
          >
            {sortedSports.map((sport) => (
              <YStack
                key={sport._id}
                width="31.5%"
                mb={GAP}
              >
                <SportTile
                  sport={sport}
                  isSelected={selectedSportId === sport._id}
                  onSelect={() => setSelectedSportId(sport._id)}
                />
              </YStack>
            ))}
          </XStack>

          {/* No Results */}
          {sortedSports.length === 0 && searchQuery && (
            <Card p="$6" bg="$surface" rounded="$4">
              <YStack items="center" gap="$2">
                <Text color="$color10" text="center" fontFamily="$body">
                  No sports found matching "{searchQuery}"
                </Text>
                <Text fontSize={13} color="$color9" text="center" fontFamily="$body">
                  Try a different search or select "General Fitness"
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>

      {/* Bottom Action */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        <Button
          size="$5"
          bg={selectedSportId ? '$primary' : '$color6'}
          color="white"
          disabled={!selectedSportId}
          onPress={handleContinue}
          iconAfter={ChevronRight}
          fontFamily="$body" fontWeight="700"
          rounded="$4"
          pressStyle={selectedSportId ? { opacity: 0.9, scale: 0.98 } : {}}
        >
          Continue
        </Button>
      </YStack>
    </YStack>
  )
}
