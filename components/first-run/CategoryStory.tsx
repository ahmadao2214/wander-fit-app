import { forwardRef, useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react'
import { Text as RNText, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import {
  CATEGORY_BEATS,
  CATEGORY_IDS,
  NIGHT,
  STORY_CATEGORIES,
  type CategoryId,
  type StoryCategory,
} from '../../lib/firstRunStory'
import { selectionFeedback } from '../../lib/haptics'
import { Athlete } from './Athlete'
import { BODY, DISPLAY } from './Night'
import { PAGE_EASE } from './intakeMotion'

export const CATEGORY_TILE_HEIGHT = 168

/**
 * Bebas Neue's advance widths for A–Z, in em, read from the font file
 * (BebasNeue_400Regular.ttf, 1000 units per em). M and W run nearly three
 * times as wide as I, so a per-letter sum beats one average width.
 */
const BEBAS_CAPS_EM: Record<string, number> = {
  A: 0.401, B: 0.404, C: 0.383, D: 0.406, E: 0.363, F: 0.344, G: 0.391, H: 0.42, I: 0.192,
  J: 0.265, K: 0.414, L: 0.344, M: 0.538, N: 0.427, O: 0.4, P: 0.386, Q: 0.4, R: 0.403,
  S: 0.372, T: 0.364, U: 0.402, V: 0.382, W: 0.557, X: 0.406, Y: 0.394, Z: 0.362,
  ' ': 0.16, '(': 0.276, ')': 0.276, '/': 0.389,
}

/** How wide `text` sets in Bebas Neue, in em. Anything not in the table counts as wide as W. */
export function displayWidthEm(text: string): number {
  return [...text.toUpperCase()].reduce((sum, ch) => sum + (BEBAS_CAPS_EM[ch] ?? 0.557), 0)
}

/** Tiles and the name shrink on short screens so the whole story fits without scrolling. */
export function categoryLayout(
  usableHeight: number,
  usableWidth = 354,
  name = 'ENDURANCE'
): { tile: number; name: number } {
  const tile = Math.round(Math.min(CATEGORY_TILE_HEIGHT, Math.max(112, (usableHeight - 360) / 2)))
  // The name stays on one line, with 6% to spare for rendering differences.
  const fitsWidth = usableWidth / (displayWidthEm(name) * 1.06)
  return { tile, name: Math.floor(Math.min(128, usableHeight * 0.17, fitsWidth)) }
}

/** Fades and rises in at `at` ms when `play`; otherwise simply there. */
export function Beat({
  at,
  play,
  children,
  style,
  testID,
}: {
  at: number
  play: boolean
  children: ReactNode
  style?: object
  testID?: string
}) {
  const k = useSharedValue(play ? 0 : 1)
  useEffect(() => {
    if (!play) {
      k.value = 1
      return
    }
    k.value = withDelay(at, withTiming(1, { duration: 380, easing: PAGE_EASE }))
  }, [play, at, k])
  const anim = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: 14 * (1 - k.value) }] }))
  return (
    <Animated.View style={[style, anim]} testID={testID}>
      {children}
    </Animated.View>
  )
}

const CategoryTile = forwardRef<ComponentRef<typeof View>, {
  cat: StoryCategory
  lit: boolean
  dim: boolean
  playMove: boolean
  settled: boolean
  height: number
}>(function CategoryTile({ cat, lit, dim, playMove, settled, height }, ref) {
  const k = useSharedValue(lit ? 1 : 0)
  const fade = useSharedValue(dim ? 1 : 0)
  useEffect(() => {
    k.value = settled ? (lit ? 1 : 0) : withTiming(lit ? 1 : 0, { duration: 400, easing: PAGE_EASE })
    fade.value = settled ? (dim ? 1 : 0) : withTiming(dim ? 1 : 0, { duration: 400, easing: PAGE_EASE })
  }, [lit, dim, settled, k, fade])
  const tileStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value * 0.55 }))
  const litStyle = useAnimatedStyle(() => ({ opacity: k.value }))
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      style={[{ height, borderRadius: 16, backgroundColor: NIGHT.ink2, overflow: 'hidden' }, tileStyle]}
      accessible
      accessibilityLabel={lit ? `${cat.name}, your category` : cat.name}
      testID={`category-tile-${cat.id}`}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: cat.color }, litStyle]} />
      <View style={{ position: 'absolute', left: 8, right: 8, top: 6, bottom: 48 }}>
        <Athlete cat={cat.id} lit={lit} tile={lit ? cat.color : NIGHT.ink2} play={playMove} settled={settled && lit} />
      </View>
      <RNText
        style={{ position: 'absolute', left: 14, bottom: 10, fontFamily: DISPLAY, fontSize: 30, lineHeight: 30, color: lit ? '#FFFFFF' : NIGHT.fg2 }}
      >
        {cat.name.toUpperCase()}
      </RNText>
    </Animated.View>
  )
})

/**
 * The reveal's first part: four category tiles with silhouette athletes.
 * The athlete's own lights in its color and plays its move once; then
 * "BASKETBALL TRAINS FOR" and the category name stamp in. `settled` shows it
 * complete with no motion (Reduce Motion, or a revisit from the plan).
 * `leaving` fades everything but the lit tile, for the handoff to the plan.
 */
export function CategoryStory({
  sportName,
  category,
  settled,
  leaving,
  revisit,
  litTileRef,
}: {
  sportName: string
  category: StoryCategory
  settled: boolean
  leaving: boolean
  revisit: boolean
  litTileRef: Ref<ComponentRef<typeof View>>
}) {
  const insets = useSafeAreaInsets()
  const { height: screenH, width: screenW } = useWindowDimensions()
  const size = categoryLayout(screenH - insets.top - insets.bottom - 56, Math.min(screenW, 560) - 48, category.name)
  const [lit, setLit] = useState(settled)
  useEffect(() => {
    if (settled) {
      setLit(true)
      return
    }
    const t = setTimeout(() => {
      setLit(true)
      selectionFeedback()
    }, CATEGORY_BEATS.lit)
    return () => clearTimeout(t)
  }, [settled])

  const leave = useSharedValue(0)
  useEffect(() => {
    leave.value = leaving ? withTiming(1, { duration: 200 }) : 0
  }, [leaving, leave])
  const leaveStyle = useAnimatedStyle(() => ({ opacity: 1 - leave.value, transform: [{ translateY: 10 * leave.value }] }))
  const play = !settled

  const tile = (id: CategoryId, i: number) => {
    const isOwn = id === category.id
    const t = (
      <Beat key={id} at={CATEGORY_BEATS.tiles + i * CATEGORY_BEATS.tileGap} play={play} style={isOwn ? { flex: 1 } : undefined}>
        <CategoryTile
          ref={isOwn ? litTileRef : undefined}
          cat={STORY_CATEGORIES[id]}
          lit={lit && isOwn}
          dim={lit && !isOwn}
          playMove={lit && isOwn && !settled}
          settled={settled}
          height={size.tile}
        />
      </Beat>
    )
    // The lit tile becomes the band, so it goes the moment the handoff starts.
    if (isOwn) return <View key={id} style={{ flex: 1, opacity: leaving ? 0 : 1 }}>{t}</View>
    return <Animated.View key={id} style={[{ flex: 1 }, leaveStyle]}>{t}</Animated.View>
  }
  return (
    <View style={{ flex: 1 }} testID="reveal-category">
      <Animated.View style={[{ marginTop: 'auto' }, leaveStyle]}>
        <Beat at={CATEGORY_BEATS.lead} play={play}>
          <RNText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 32, color: NIGHT.fg2, letterSpacing: 1 }}
          >
            {`${sportName.toUpperCase()} TRAINS FOR`}
          </RNText>
        </Beat>
        <Beat at={CATEGORY_BEATS.name} play={play}>
          <RNText
            style={{ fontFamily: DISPLAY, fontSize: size.name, lineHeight: Math.round(size.name * 0.88), paddingTop: Math.round(size.name * 0.1), color: category.color }}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            // Its size is already worked out from the screen; Dynamic Type
            // scaling on top would push it past the edge.
            maxFontSizeMultiplier={1}
            testID="reveal-category-name"
          >
            {category.name.toUpperCase()}
          </RNText>
        </Beat>
        <Beat at={CATEGORY_BEATS.line} play={play}>
          <RNText style={{ fontFamily: BODY, fontSize: 16, lineHeight: 24, color: NIGHT.fg, maxWidth: 320, marginTop: 8 }}>
            {category.line}
          </RNText>
        </Beat>
      </Animated.View>

      <View style={{ gap: 8, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{CATEGORY_IDS.slice(0, 2).map((id, i) => tile(id, i))}</View>
        <View style={{ flexDirection: 'row', gap: 8 }}>{CATEGORY_IDS.slice(2).map((id, i) => tile(id, i + 2))}</View>
      </View>

      <Animated.View style={leaveStyle}>
        <RNText style={{ fontFamily: BODY, fontSize: 14, color: NIGHT.fg2, textAlign: 'center', marginTop: 16 }} testID="reveal-tap-note">
          {revisit ? 'Tap to go back to your plan' : 'Tap to see your plan'}
        </RNText>
      </Animated.View>
    </View>
  )
}
