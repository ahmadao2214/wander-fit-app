import { Text, Theme, XStack, YStack, type ColorTokens } from 'tamagui'
import { SPORT_THEME_NAMES, type SportThemeName } from '../lib/sportTamaguiTheme'

// Proof for issue #208: the basketball chalkboard and whiteboard themes resolve
// in Tamagui. Not mounted anywhere in the app; existing screens stay on light
// and dark. Every colour is a theme token, so this file holds no raw colour.

// Tamagui types only the keys every theme shares. light and dark carry no
// marker, on purpose (old screens can't reach the pen), so name it here.
const MARKER = '$marker' as ColorTokens

type Props = {
  /** One theme, or both side by side when omitted. */
  theme?: SportThemeName
}

const LABEL: Record<SportThemeName, string> = {
  chalkboard: 'Chalkboard',
  whiteboard: 'Whiteboard',
}

function ProofBlock({ name }: { name: SportThemeName }) {
  return (
    <Theme name={name}>
      <YStack testID={`sport-theme-proof-${name}`} bg="$background" p="$4" gap="$3" rounded="$4">
        <Text color="$color" fontSize={13}>
          {LABEL[name]}
        </Text>
        <Text color="$color" fontSize={28} fontWeight="700">
          Build
        </Text>
        <XStack
          accessibilityRole="button"
          bg="$primary"
          rounded="$3"
          px="$4"
          minH={44}
          items="center"
          justify="center"
          self="flex-start"
        >
          <Text color="$background" fontWeight="700">
            Log Set
          </Text>
        </XStack>
        <Text color={MARKER}>Drive left, kick out to the corner.</Text>
      </YStack>
    </Theme>
  )
}

export function SportThemeProof({ theme }: Props) {
  const names: SportThemeName[] = theme ? [theme] : Object.values(SPORT_THEME_NAMES)
  return (
    <YStack gap="$4">
      {names.map((name) => (
        <ProofBlock key={name} name={name} />
      ))}
    </YStack>
  )
}

export default SportThemeProof
