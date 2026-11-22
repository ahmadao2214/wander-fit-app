import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text as RNText, TextInput, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Spinner } from 'tamagui'
import { api } from '../../convex/_generated/api'
import { IntakeFrame } from '../../components/first-run/IntakeFrame'
import { BODY, BODY_SEMI, Headline, Label, SportShape, headlineSize } from '../../components/first-run/Night'
import { PAGE_EASE } from '../../components/first-run/intakeMotion'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { analytics, FIRST_RUN_STEP_INDEX } from '../../lib/analytics'
import { NIGHT, mixHex, splitSports, storyCategory, tintedGround } from '../../lib/firstRunStory'
import { selectionFeedback } from '../../lib/haptics'

/** Case- and accent-insensitive match on any part of the name. */
export function matchesSearch(name: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = fold(query.trim())
  return q === '' || fold(name).includes(q)
}

/** The selected tile's play count: changing it plays the icon once more. */
type Played = { id: string; n: number } | null

function SportTile({
  name,
  selected,
  color,
  size,
  playKey,
  moving,
  onPress,
}: {
  name: string
  selected: boolean
  color: string
  size: 'large' | 'small'
  playKey: number | null
  moving: boolean
  onPress: () => void
}) {
  const icon = size === 'large' ? 86 : 58
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={name}
      testID={`sport-${name}`}
      style={({ pressed }) => ({ width: '31.5%', transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          gap: 4,
          paddingVertical: 8,
          paddingHorizontal: 4,
          borderRadius: size === 'large' ? 16 : 12,
          backgroundColor: selected ? mixHex(color, NIGHT.ink2, 0.3) : NIGHT.ink2,
          borderWidth: 2,
          borderColor: selected ? color : 'transparent',
          minHeight: size === 'large' ? 128 : 100,
        }}
      >
        {/* The tapped sport plays its move once; nothing else moves with it. */}
        <SportShape name={name} size={icon} play={selected && moving && playKey !== null} playKey={playKey ?? 0} speed={1.6} />
        <RNText
          numberOfLines={2}
          style={{ fontFamily: BODY_SEMI, fontSize: 12, lineHeight: 15, color: NIGHT.fg, textAlign: 'center' }}
        >
          {name}
        </RNText>
      </View>
    </Pressable>
  )
}

/** Fades the world into the category color: the hint before the payoff. */
export function TintLayer({ color, moving }: { color: string; moving: boolean }) {
  const [layers, setLayers] = useState({ under: color, over: color })
  const k = useSharedValue(1)
  const last = useRef(color)
  useEffect(() => {
    if (color === last.current) return
    setLayers({ under: last.current, over: color })
    last.current = color
    k.value = moving ? 0 : 1
    if (moving) k.value = withTiming(1, { duration: 900, easing: PAGE_EASE })
  }, [color, moving, k])
  const style = useAnimatedStyle(() => ({ opacity: k.value }))
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: layers.under }}>
      <Animated.View style={[{ flex: 1, backgroundColor: layers.over }, style]} />
    </View>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }} accessibilityRole="radiogroup">
      {children}
    </View>
  )
}

/** Question 1: the sport decides the training category. */
export default function FirstRunSport() {
  const router = useRouter()
  const motion = useIntakeMotion()
  const { width } = useWindowDimensions()
  const sports = useQuery(api.sports.list)
  const { draft, save } = useFirstRunDraft()
  const [search, setSearch] = useState('')
  const [played, setPlayed] = useState<Played>(null)
  useReachStep('sport')

  const selectedId = draft?.answers.sportId
  const selected = sports?.find((s) => s._id === selectedId)
  const category = selected ? storyCategory(selected.gppCategoryId) : null
  const { popular, rest } = useMemo(() => splitSports(sports ?? []), [sports])
  // Searching covers every sport and folds the Popular row away, so the
  // matches sit right under the field instead of below the fold.
  const searching = search.trim() !== ''
  const shownRest = searching
    ? (sports ?? []).filter((s) => matchesSearch(s.name, search)).sort((a, b) => a.name.localeCompare(b.name))
    : rest

  const select = (sport: { _id: string }) => {
    selectionFeedback()
    setPlayed((p) => ({ id: sport._id, n: (p?.n ?? 0) + 1 }))
    void save({ sportId: sport._id })
  }

  const tile = (s: { _id: string; name: string; gppCategoryId: number }, size: 'large' | 'small') => (
    <SportTile
      key={s._id}
      name={s.name}
      size={size}
      selected={s._id === selectedId}
      color={storyCategory(s.gppCategoryId).color}
      playKey={played?.id === s._id ? played.n : null}
      moving={motion.moving}
      onPress={() => select(s)}
    />
  )
  const pad = (n: number) => Array.from({ length: (3 - (n % 3)) % 3 }, (_, i) => <View key={`pad-${i}`} style={{ width: '31.5%' }} />)

  return (
    <IntakeFrame
      step="sport"
      ground={NIGHT.ink}
      moving={motion.moving}
      behind={<TintLayer color={tintedGround(category?.color)} moving={motion.moving} />}
      primary={{
        label: 'Continue',
        disabled: !selectedId,
        onPress: () => {
          analytics.trackFirstRunStepAdvanced({
            step: 'sport',
            step_index: FIRST_RUN_STEP_INDEX.sport,
            sport_category_id: selected?.gppCategoryId,
          })
          router.push({ pathname: '/(first-run)/season', params: { fly: '1' } })
        },
        testID: 'first-run-continue',
      }}
    >
      <Headline size={headlineSize(64, width)} moving={motion.moving}>
        Pick your sport
      </Headline>

      {sports === undefined ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <Spinner size="large" color="$primaryText" />
        </View>
      ) : (
        <>
          {searching ? null : (
            <>
              <Label style={{ marginTop: 16, marginBottom: 12 }}>Popular</Label>
              <Grid>{popular.map((s) => tile(s, 'large'))}</Grid>
            </>
          )}

          <Label style={{ marginTop: 24 }}>All sports</Label>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${sports.length} sports`}
            placeholderTextColor={NIGHT.fg2}
            accessibilityLabel="Search sports"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            testID="sport-search"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: NIGHT.line,
              color: NIGHT.fg,
              paddingHorizontal: 16,
              fontFamily: BODY,
              fontSize: 16,
              marginTop: 8,
              marginBottom: 12,
            }}
          />
          {shownRest.length === 0 ? (
            <RNText style={{ fontFamily: BODY, fontSize: 15, color: NIGHT.fg2, textAlign: 'center', paddingVertical: 16 }}>
              No sport matches “{search.trim()}”. Pick General Fitness if yours isn't listed.
            </RNText>
          ) : (
            <Grid>
              {shownRest.map((s) => tile(s, 'small'))}
              {pad(shownRest.length)}
            </Grid>
          )}
        </>
      )}
    </IntakeFrame>
  )
}
