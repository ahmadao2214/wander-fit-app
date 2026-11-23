import Svg, { Path } from 'react-native-svg'
import { Button, useTheme } from 'tamagui'
import { GoogleIcon } from './GoogleIcon'

type SocialButtonProps = {
  onPress: () => void
  testID?: string
}

function AppleLogo({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </Svg>
  )
}

/**
 * Sign in with Apple. Apple's button contrast: a dark button in light mode
 * and a light button in dark mode, so it uses the theme's inverse colors.
 */
export function AppleSignInButton({ onPress, testID }: SocialButtonProps) {
  const theme = useTheme()
  return (
    <Button
      size="$5"
      bg="$color12"
      color="$background"
      fontFamily="$body"
      fontWeight="700"
      rounded="$4"
      pressStyle={{ bg: '$color11', scale: 0.98 }}
      icon={<AppleLogo color={theme.background.val} />}
      onPress={onPress}
      testID={testID}
    >
      Continue with Apple
    </Button>
  )
}

/** Sign in with Google, in Google's light button style. */
export function GoogleSignInButton({ onPress, testID }: SocialButtonProps) {
  return (
    <Button
      size="$5"
      bg="white"
      borderWidth={1}
      borderColor="#dadce0"
      fontFamily="$body"
      fontWeight="500"
      color="#3c4043"
      rounded="$4"
      hoverStyle={{ bg: '#f1f3f4', borderColor: '#c0c4c7' }}
      pressStyle={{ bg: '#e8eaed', scale: 0.98 }}
      icon={<GoogleIcon size={20} />}
      onPress={onPress}
      testID={testID}
    >
      Continue with Google
    </Button>
  )
}
