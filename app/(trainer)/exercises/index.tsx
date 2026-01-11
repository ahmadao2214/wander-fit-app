import { useState } from 'react'
import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled, Input, Select } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Dumbbell,
  Search,
  Plus,
  Filter,
  ChevronRight,
  ChevronDown,
} from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
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

const TagBadge = styled(XStack, {
  px: '$2',
  py: '$1',
  rounded: '$2',
  bg: '$brand2',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ExerciseLibraryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  // Get exercises with search and filters
  const exerciseResults = useQuery(api.exercises.search, {
    query: searchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    difficulty: selectedDifficulty as 'beginner' | 'intermediate' | 'advanced' | undefined,
    limit: 50,
  })

  // Get all available tags for filter
  const allTags = useQuery(api.exercises.getAllTags)

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading...
        </Text>
      </YStack>
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$4"
            px="$4"
            pt={insets.top + 16}
            pb={insets.bottom + 100}
            maxW={800}
            width="100%"
            self="center"
          >
            {/* Header */}
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={ArrowLeft}
                onPress={() => router.back()}
                circular
              />
              <YStack flex={1}>
                <DisplayHeading>EXERCISE LIBRARY</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {exerciseResults?.total ?? 0} exercises
                </Text>
              </YStack>
              <Button
                size="$4"
                bg="$primary"
                color="white"
                icon={Plus}
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                onPress={() => router.push('/(trainer)/exercises/create')}
              >
                Add New
              </Button>
            </XStack>

            {/* Search Bar */}
            <XStack items="center" gap="$2" bg="$surface" rounded="$4" px="$3" borderWidth={1} borderColor="$borderColor">
              <Search size={20} color="$color10" />
              <Input
                flex={1}
                placeholder="Search exercises..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                bg="transparent"
                borderWidth={0}
                fontFamily="$body"
                size="$4"
              />
              <Button
                size="$3"
                bg={showFilters ? '$primary' : 'transparent'}
                icon={Filter}
                circular
                onPress={() => setShowFilters(!showFilters)}
              />
            </XStack>

            {/* Filters */}
            {showFilters && (
              <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
                <YStack gap="$4">
                  {/* Difficulty Filter */}
                  <YStack gap="$2">
                    <Text fontFamily="$body" fontWeight="600" fontSize={13} color="$color11">
                      Difficulty
                    </Text>
                    <XStack gap="$2" flexWrap="wrap">
                      {['beginner', 'intermediate', 'advanced'].map((diff) => (
                        <Button
                          key={diff}
                          size="$3"
                          bg={selectedDifficulty === diff ? '$primary' : '$color4'}
                          color={selectedDifficulty === diff ? 'white' : '$color11'}
                          fontFamily="$body"
                          fontWeight="500"
                          rounded="$3"
                          onPress={() =>
                            setSelectedDifficulty(
                              selectedDifficulty === diff ? undefined : diff
                            )
                          }
                        >
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  {/* Tags Filter */}
                  <YStack gap="$2">
                    <Text fontFamily="$body" fontWeight="600" fontSize={13} color="$color11">
                      Tags
                    </Text>
                    <XStack gap="$2" flexWrap="wrap">
                      {allTags?.slice(0, 15).map((tag) => (
                        <Button
                          key={tag}
                          size="$2"
                          bg={selectedTags.includes(tag) ? '$primary' : '$color4'}
                          color={selectedTags.includes(tag) ? 'white' : '$color10'}
                          fontFamily="$body"
                          fontSize={11}
                          rounded="$2"
                          onPress={() => toggleTag(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  {/* Clear Filters */}
                  {(selectedDifficulty || selectedTags.length > 0) && (
                    <Button
                      size="$3"
                      bg="$red3"
                      color="$red11"
                      fontFamily="$body"
                      fontWeight="600"
                      rounded="$3"
                      onPress={() => {
                        setSelectedDifficulty(undefined)
                        setSelectedTags([])
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </YStack>
              </Card>
            )}

            {/* Exercise List */}
            <YStack gap="$2">
              {exerciseResults?.exercises.map((exercise) => (
                <Card
                  key={exercise._id}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ bg: '$surfaceHover' }}
                  onPress={() => {
                    // Could navigate to exercise detail/edit page
                  }}
                >
                  <XStack items="center" gap="$3">
                    <YStack
                      width={48}
                      height={48}
                      rounded="$4"
                      bg="$brand2"
                      items="center"
                      justify="center"
                    >
                      <Dumbbell size={24} color="$primary" />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={15}>
                        {exercise.name}
                      </Text>
                      <XStack gap="$2" flexWrap="wrap">
                        {exercise.difficulty && (
                          <TagBadge>
                            <Text fontSize={10} color="$primary" fontFamily="$body" fontWeight="600">
                              {exercise.difficulty}
                            </Text>
                          </TagBadge>
                        )}
                        {exercise.tags.slice(0, 3).map((tag) => (
                          <Text key={tag} fontSize={11} color="$color9" fontFamily="$body">
                            {tag}
                          </Text>
                        ))}
                        {exercise.tags.length > 3 && (
                          <Text fontSize={11} color="$color9" fontFamily="$body">
                            +{exercise.tags.length - 3} more
                          </Text>
                        )}
                      </XStack>
                    </YStack>
                    <ChevronRight size={20} color="$color9" />
                  </XStack>
                </Card>
              ))}

              {exerciseResults?.exercises.length === 0 && (
                <Card
                  p="$6"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$3">
                    <YStack bg="$brand2" p="$3" rounded="$10">
                      <Search size={24} color="$primary" />
                    </YStack>
                    <Text fontFamily="$body" fontWeight="600" color="$color10">
                      No Exercises Found
                    </Text>
                    <Text text="center" color="$color9" fontFamily="$body" fontSize={13}>
                      Try adjusting your search or filters
                    </Text>
                  </YStack>
                </Card>
              )}

              {exerciseResults?.hasMore && (
                <Text text="center" color="$color9" fontFamily="$body" fontSize={13} py="$2">
                  Scroll to load more...
                </Text>
              )}
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
