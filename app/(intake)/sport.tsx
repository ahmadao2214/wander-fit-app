import { useState } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Spinner, Input, Circle } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'expo-router'
import { 
  Search,
  ChevronRight,
  Target,
  Check,
} from '@tamagui/lucide-icons'
import { Id } from '../../convex/_generated/dataModel'
import LottieView from 'lottie-react-native'

// ─────────────────────────────────────────────────────────────────────────────
// Sport Icon Lottie Mapping
// Maps sport names to their Lottie animation files
// Download animations from LottieFiles.com and place in assets/lottie/sports/
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_LOTTIE: Record<string, any> = {
  'Soccer': require('../../assets/lottie/sports/soccer.json'),
  // Add more sports here as animations are added
}

// ─────────────────────────────────────────────────────────────────────────────
// SportIcon Component
// Placeholder using styled initials - designed to be swapped for Lottie later
// ─────────────────────────────────────────────────────────────────────────────

interface SportIconProps {
  name: string
  size?: number
  isSelected?: boolean
}

/**
 * SportIcon - Icon component for sports
 * 
 * Renders Lottie animation if available, otherwise falls back to styled initials.
 */
const SportIcon = ({ name, size = 56, isSelected = false }: SportIconProps) => {
  // Check if we have a Lottie animation for this sport
  const lottieSource = SPORT_LOTTIE[name]
  
  if (lottieSource) {
    return (
      <Circle 
        size={size} 
        bg={isSelected ? '$green5' : '$gray4'}
        overflow="hidden"
        items="center"
        justify="center"
      >
        <LottieView
          // Key forces remount when selection changes, triggering autoPlay
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

  // Fallback: Extract initials for sports without Lottie animations
  // "Field Hockey" → "FH", "Soccer" → "S", "Track (Distance)" → "TD"
  const initials = name
    .split(/[\s()/]+/) // Split on spaces, parentheses, and slashes
    .filter(word => word.length > 0) // Remove empty strings
    .map(word => word[0]) // Get first letter of each word
    .filter(char => /[A-Za-z]/.test(char)) // Only keep letters
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Circle 
      size={size} 
      bg={isSelected ? '$green5' : '$gray4'}
    >
      <Text 
        fontSize={size / 2.5} 
        fontWeight="700" 
        color={isSelected ? '$green11' : '$gray11'}
      >
        {initials}
      </Text>
    </Circle>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SportTile Component
// Individual tile for a sport in the grid
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
      // Fill the grid cell width, use aspect ratio for square tiles
      width="100%"
      aspectRatio={1}
      bg={isSelected ? '$green2' : '$gray2'}
      borderColor={isSelected ? '$green8' : 'transparent'}
      borderWidth={2}
      borderRadius="$4"
      pressStyle={{ scale: 0.95, opacity: 0.9 }}
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
          size={48}
          isSelected={isSelected} 
        />
        <Text 
          fontSize="$2" 
          fontWeight="600" 
          textAlign="center" 
          numberOfLines={2}
          color={isSelected ? '$green11' : '$color12'}
        >
          {sport.name}
        </Text>
      </YStack>
      
      {/* Selected indicator */}
      {isSelected && (
        <Circle
          size={24}
          bg="$green9"
          position="absolute"
          top={8}
          right={8}
        >
          <Check size={14} color="white" strokeWidth={3} />
        </Circle>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport Selection Screen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sport Selection Screen
 * 
 * Step 1 of intake flow.
 * User selects their primary sport from a visual tile grid.
 * GPP category is determined behind the scenes - not shown to user.
 */
export default function SportSelectionScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSportId, setSelectedSportId] = useState<Id<"sports"> | null>(null)

  // Get all sports (no categories needed for display)
  const sports = useQuery(api.sports.list, {})

  // Grid gap for tile spacing
  const GAP = 12 // $3 gap between tiles

  if (!sports) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading sports...</Text>
      </YStack>
    )
  }

  // Filter sports by search query (flat list, no categories)
  const filteredSports = searchQuery
    ? sports.filter((s) => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sports

  // Sort alphabetically for consistent ordering
  const sortedSports = [...filteredSports].sort((a, b) => 
    a.name.localeCompare(b.name)
  )

  const handleContinue = () => {
    if (selectedSportId) {
      router.push({
        pathname: '/(intake)/experience',
        params: { sportId: selectedSportId },
      })
    }
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$10"
          pb="$8"
          maxW={600}
          width="100%"
          alignSelf="center"
        >
          {/* Header */}
          <YStack gap="$2" items="center">
            <Target size={48} color="$green10" />
            <H2 textAlign="center">What's Your Sport?</H2>
            <Text color="$gray11" textAlign="center" fontSize="$4">
              Select your primary sport to get a personalized training program
            </Text>
          </YStack>

          {/* Search */}
          <XStack
            bg="$gray3"
            borderRadius="$4"
            px="$3"
            py="$2"
            items="center"
            gap="$2"
          >
            <Search size={20} color="$gray10" />
            <Input
              flex={1}
              placeholder="Search sports..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              bg="transparent"
              borderWidth={0}
              fontSize="$4"
              placeholderTextColor="$gray9"
            />
          </XStack>

          {/* Sport Tiles Grid - Using CSS Grid for reliable 3-column layout */}
          <YStack 
            width="100%"
            style={{
              display: 'grid' as any,
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: GAP,
            }}
          >
            {sortedSports.map((sport) => (
              <SportTile
                key={sport._id}
                sport={sport}
                isSelected={selectedSportId === sport._id}
                onSelect={() => setSelectedSportId(sport._id)}
              />
            ))}
          </YStack>

          {/* No Results */}
          {sortedSports.length === 0 && searchQuery && (
            <Card p="$6" bg="$gray2">
              <YStack items="center" gap="$2">
                <Text color="$gray10" textAlign="center">
                  No sports found matching "{searchQuery}"
                </Text>
                <Text fontSize="$2" color="$gray9" textAlign="center">
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
        borderTopWidth={1}
        borderTopColor="$gray5"
        bg="$background"
      >
        <Button
          size="$5"
          bg={selectedSportId ? '$green9' : '$gray6'}
          color="white"
          disabled={!selectedSportId}
          onPress={handleContinue}
          iconAfter={ChevronRight}
          fontWeight="700"
        >
          Continue
        </Button>
      </YStack>
    </YStack>
  )
}
