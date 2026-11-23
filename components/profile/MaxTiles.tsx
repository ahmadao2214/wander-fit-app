import { Card, Separator, XStack, YStack } from 'tamagui'
import { Body, Caption, numeric } from '../Typography'

export interface MaxTile {
  slug: string
  name: string
  currentMax: number | null
}

/** How far the card rides up over the bottom edge of the Profile header. */
export const MAX_TILES_OVERLAP = 44

/**
 * The core-lift maxes as one card of tiles that sits over the header's bottom
 * edge. A max is a number the athlete entered, so it shows as a number with
 * its unit; a lift with no max says "Add", never 0.
 */
export function MaxTiles({
  lifts,
  onPress,
}: {
  lifts: readonly MaxTile[]
  onPress: (slug: string) => void
}) {
  return (
    <Card
      bg="$surface"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
      mt={-MAX_TILES_OVERLAP}
      shadowColor="#0F172A"
      shadowOpacity={0.08}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 4 }}
      elevation={2}
    >
      <XStack>
        {lifts.map((lift, index) => (
          <XStack key={lift.slug} flex={1} flexBasis={0}>
            {index > 0 ? <Separator vertical borderColor="$borderColor" /> : null}
            <YStack
              flex={1}
              minH={72}
              px="$3"
              py="$3"
              gap="$0.5"
              justify="center"
              pressStyle={{ bg: '$surfaceHover' }}
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
                <Body fontSize={20} lineHeight={24} fontWeight="700" color="$primaryText">
                  Add
                </Body>
              )}
              <Caption numberOfLines={2}>{lift.name}</Caption>
            </YStack>
          </XStack>
        ))}
      </XStack>
    </Card>
  )
}
