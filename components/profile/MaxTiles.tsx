import type { ReactNode } from 'react'
import { Card, Separator, XStack, YStack } from 'tamagui'
import { ChevronRight } from '@tamagui/lucide-icons'
import { Body, Caption, Supporting, numeric } from '../Typography'

export interface MaxTile {
  slug: string
  name: string
  currentMax: number | null
}

/** How far the card rides up over the bottom edge of the Profile header. */
export const MAX_TILES_OVERLAP = 44

const TILE_HEIGHT = 72

/**
 * The card's frame. The shadow is on the outer view and the clipping on the
 * inner one: iOS drops a view's own shadow once it clips its content.
 */
function Frame({ children, testID }: { children?: ReactNode; testID?: string }) {
  return (
    <YStack
      mt={-MAX_TILES_OVERLAP}
      rounded="$4"
      bg="$surface"
      shadowColor="#0F172A"
      shadowOpacity={0.12}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 4 }}
      elevation={2}
      testID={testID}
    >
      <Card
        bg="$surface"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderColor"
        overflow="hidden"
        minH={TILE_HEIGHT}
      >
        {children}
      </Card>
    </YStack>
  )
}

/** Holds the card's place while the program and the maxes load, so nothing jumps. */
export function MaxTilesPlaceholder() {
  return <Frame testID="max-tiles-loading" />
}

/**
 * The core-lift maxes as one card that sits over the header's bottom edge. A
 * max is a number the athlete entered, so it shows as a number with its unit.
 * With none entered yet, the card is one prompt, not three equal buttons.
 */
export function MaxTiles({
  lifts,
  onPress,
  onAddAll,
}: {
  lifts: readonly MaxTile[]
  onPress: (slug: string) => void
  /** Opens entry for every lift at once. Used while no max is set. */
  onAddAll: () => void
}) {
  if (lifts.every((lift) => !lift.currentMax)) {
    return (
      <Frame>
        <XStack
          minH={TILE_HEIGHT}
          px="$4"
          py="$3"
          gap="$3"
          items="center"
          pressStyle={{ bg: '$surfaceActive' }}
          onPress={onAddAll}
          role="button"
          aria-label="Add your maxes"
          testID="max-add-all"
        >
          <YStack flex={1} gap="$0.5">
            <Body fontWeight="600" color="$primaryText">
              Add your maxes
            </Body>
            <Supporting color="$color10">{lifts.map((lift) => lift.name).join(', ')}</Supporting>
          </YStack>
          <ChevronRight size={20} color="$color9" />
        </XStack>
      </Frame>
    )
  }

  return (
    <Frame>
      <XStack>
        {lifts.map((lift, index) => (
          <XStack key={lift.slug} flex={1} flexBasis={0}>
            {index > 0 ? <Separator vertical borderColor="$borderColor" /> : null}
            <YStack
              flex={1}
              minH={TILE_HEIGHT}
              px="$3"
              py="$3"
              gap="$0.5"
              justify="center"
              pressStyle={{ bg: '$surfaceActive' }}
              onPress={() => onPress(lift.slug)}
              role="button"
              aria-label={
                lift.currentMax
                  ? `${lift.name}, ${lift.currentMax} pounds. Edit`
                  : `${lift.name}, not set. Add`
              }
              testID={`max-row-${lift.slug}`}
            >
              {lift.currentMax ? (
                <XStack items="baseline" gap="$1">
                  <Body fontSize={20} lineHeight={24} fontWeight="700" style={numeric}>
                    {lift.currentMax}
                  </Body>
                  <Caption>lb</Caption>
                </XStack>
              ) : (
                <Body fontSize={16} lineHeight={24} fontWeight="600" color="$primaryText">
                  Add
                </Body>
              )}
              <Caption numberOfLines={2}>{lift.name}</Caption>
            </YStack>
          </XStack>
        ))}
      </XStack>
    </Frame>
  )
}
