import { useMemo, useState } from 'react'
import { Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { Input, Spinner, Text, XStack, YStack } from 'tamagui'
import { Search } from '@tamagui/lucide-icons'
import { api } from '../../convex/_generated/api'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { ProgramBar } from '../../components/first-run/ProgramBar'
import { useReachStep } from '../../components/first-run/useReachStep'
import { SportIcon } from '../../components/sport-icon/SportIcon'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { selectionFeedback } from '../../lib/haptics'

/** Case- and accent-insensitive match on any part of the name. */
export function matchesSearch(name: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = fold(query.trim())
  return q === '' || fold(name).includes(q)
}

function SportTile({
  name,
  selected,
  onPress,
}: {
  name: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={name}
      testID={`sport-${name}`}
      style={({ pressed }) => ({ width: '31%', transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <YStack
        items="center"
        gap="$2"
        py="$3"
        px="$1.5"
        rounded="$4"
        borderWidth={2}
        borderColor={selected ? '$primary' : '$borderColor'}
        bg={selected ? '$brand2' : '$surface'}
        minH={104}
      >
        <SportIcon name={name} mode="still" size={48} bg={selected ? '$background' : '$color3'} />
        <Text
          fontFamily="$body"
          fontSize={13}
          lineHeight={17}
          fontWeight={selected ? '700' : '500'}
          color="$color12"
          text="center"
          numberOfLines={2}
        >
          {name}
        </Text>
      </YStack>
    </Pressable>
  )
}

/** Question 1: the sport decides the training category. */
export default function FirstRunSport() {
  const router = useRouter()
  const sports = useQuery(api.sports.list)
  const { draft, save } = useFirstRunDraft()
  const [search, setSearch] = useState('')
  useReachStep('sport')

  const selectedId = draft?.answers.sportId
  const shown = useMemo(() => (sports ?? []).filter((s) => matchesSearch(s.name, search)), [sports, search])

  const select = (sportId: string) => {
    selectionFeedback()
    void save({ sportId })
  }

  return (
    <FirstRunScreen
      step="sport"
      title="What do you play?"
      above={draft ? <ProgramBar answers={draft.answers} /> : null}
      primaryLabel="Continue"
      primaryDisabled={!selectedId}
      onPrimary={() => router.push('/(first-run)/season')}
      primaryTestID="first-run-continue"
    >
      <XStack
        bg="$surface"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderColor"
        px="$3"
        items="center"
        gap="$2"
        focusWithinStyle={{ borderColor: '$primary' }}
      >
        <Search size={18} color="$color10" />
        <Input
          flex={1}
          value={search}
          onChangeText={setSearch}
          placeholder="Search sports"
          accessibilityLabel="Search sports"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          bg="transparent"
          borderWidth={0}
          fontFamily="$body"
          fontSize={16}
          px={0}
          testID="sport-search"
        />
      </XStack>

      {sports === undefined ? (
        <YStack py="$8" items="center">
          <Spinner size="large" color="$primaryText" />
        </YStack>
      ) : shown.length === 0 ? (
        <YStack py="$6" gap="$2" items="center">
          <Text fontFamily="$body" fontSize={15} color="$color11" text="center">
            No sport matches “{search.trim()}”.
          </Text>
          <Text fontFamily="$body" fontSize={15} color="$color11" text="center">
            Pick General Fitness if yours isn't listed.
          </Text>
        </YStack>
      ) : (
        <XStack flexWrap="wrap" justify="space-between" rowGap="$3" accessibilityRole="radiogroup">
          {shown.map((sport) => (
            <SportTile
              key={sport._id}
              name={sport.name}
              selected={sport._id === selectedId}
              onPress={() => select(sport._id)}
            />
          ))}
          {/* Keep the last row left-aligned. */}
          {Array.from({ length: (3 - (shown.length % 3)) % 3 }, (_, i) => (
            <YStack key={`pad-${i}`} width="31%" />
          ))}
        </XStack>
      )}
    </FirstRunScreen>
  )
}
