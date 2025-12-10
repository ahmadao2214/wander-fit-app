import { useState } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Spinner, Input } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'expo-router'
import { 
  Search,
  ChevronRight,
  Target,
} from '@tamagui/lucide-icons'
import { Id } from '../../convex/_generated/dataModel'

/**
 * Sport Selection Screen
 * 
 * Step 1 of intake flow.
 * User selects their primary sport, which determines their GPP category.
 */
export default function SportSelectionScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSportId, setSelectedSportId] = useState<Id<"sports"> | null>(null)

  // Get all sports
  const sports = useQuery(api.sports.list, {})

  // Get categories for display
  const categories = useQuery(api.sports.getCategories, {})

  if (!sports || !categories) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading sports...</Text>
      </YStack>
    )
  }

  // Filter sports by search query
  const filteredSports = searchQuery
    ? sports.filter((s) => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sports

  // Group sports by category
  const sportsByCategory = categories.map((category) => ({
    category,
    sports: filteredSports.filter((s) => s.gppCategoryId === category.categoryId),
  })).filter((group) => group.sports.length > 0)

  const handleContinue = () => {
    if (selectedSportId) {
      // Store in URL params for next screen
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

          {/* Sports by Category */}
          <YStack gap="$5">
            {sportsByCategory.map(({ category, sports: categorySports }) => (
              <YStack key={category.categoryId} gap="$3">
                <YStack gap="$1">
                  <H3 fontSize="$5">{category.shortName}</H3>
                  <Text fontSize="$2" color="$gray10">
                    {category.name}
                  </Text>
                </YStack>

                <YStack gap="$2">
                  {categorySports.map((sport) => {
                    const isSelected = selectedSportId === sport._id

                    return (
                      <Card
                        key={sport._id}
                        p="$4"
                        bg={isSelected ? '$green2' : '$background'}
                        borderColor={isSelected ? '$green8' : '$gray6'}
                        borderWidth={isSelected ? 2 : 1}
                        pressStyle={{ scale: 0.98, opacity: 0.9 }}
                        onPress={() => setSelectedSportId(sport._id)}
                      >
                        <XStack items="center" gap="$3">
                          <YStack flex={1}>
                            <Text fontSize="$4" fontWeight="600">
                              {sport.name}
                            </Text>
                            {sport.description && (
                              <Text fontSize="$2" color="$gray10">
                                {sport.description}
                              </Text>
                            )}
                          </YStack>
                          {isSelected && (
                            <Card bg="$green9" px="$2" py="$1" borderRadius="$10">
                              <Text fontSize="$1" color="white" fontWeight="600">
                                SELECTED
                              </Text>
                            </Card>
                          )}
                        </XStack>
                      </Card>
                    )
                  })}
                </YStack>
              </YStack>
            ))}
          </YStack>

          {/* No Results */}
          {sportsByCategory.length === 0 && searchQuery && (
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

