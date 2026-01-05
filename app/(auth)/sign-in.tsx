import React, { useCallback, useEffect } from 'react'
import { useSignIn, useSSO } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Platform, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Text, Input, Button, YStack, XStack, styled, Card } from 'tamagui'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { PublicOnlyRoute } from '../../components/AuthGuard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Zap } from '@tamagui/lucide-icons'
import { GoogleIcon } from '../../components/GoogleIcon'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 40,
  letterSpacing: 1,
  color: '$color12',
  text: 'center',
})

const Subtitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 16,
  color: '$color10',
  text: 'center',
  lineHeight: 24,
})

const Divider = styled(YStack, {
  height: 1,
  flex: 1,
  bg: '$borderColor',
})

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// Custom hook for warming up browser on Android
export const useWarmUpBrowser = () => {
  useEffect(() => {
    Platform.OS === 'android' && void WebBrowser.warmUpAsync()
    return () => {
      Platform.OS === 'android' && void WebBrowser.coolDownAsync()
    }
  }, [])
}

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession()

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  useWarmUpBrowser()
  const insets = useSafeAreaInsets()

  const { signIn, setActive, isLoaded } = useSignIn()
  const { startSSOFlow } = useSSO()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isSigningIn, setIsSigningIn] = React.useState(false)

  // Handle OAuth sign-in
  const onOAuthPress = useCallback(async () => {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Platform.OS === 'web'
          ? AuthSession.makeRedirectUri()
          : Platform.OS === 'ios' || Platform.OS === 'android'
            ? AuthSession.makeRedirectUri({
                scheme: 'myapp',
                path: 'oauth'
              })
            : undefined,
      })

      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async () => {
            if (Platform.OS !== 'web') {
              setTimeout(() => {
                router.replace('/')
              }, 500)
            } else {
              router.replace('/')
            }
          },
        })
      } else {
        if (signUp) {
          router.push('/(auth)/sign-up')
        }
      }
    } catch (err) {
      console.error('OAuth Error:', JSON.stringify(err, null, 2))
    }
  }, [startSSOFlow, router])

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return

    setError('')
    setIsSigningIn(true)

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        
        if (Platform.OS !== 'web') {
          setTimeout(() => {
            router.replace('/')
          }, 500)
        } else {
          router.replace('/')
        }
      } else if (signInAttempt.status === 'needs_second_factor') {
        setError('Two-factor authentication is required. Please use "Continue with Google".')
      } else if (signInAttempt.status === 'needs_first_factor') {
        setError('Additional verification required. Please try "Continue with Google".')
      } else {
        setError(`Sign in incomplete. Please try again or use a different method.`)
      }
    } catch (err: any) {
      const clerkError = err?.errors?.[0]
      const errorCode = clerkError?.code || err?.code
      const errorMessage = clerkError?.longMessage || clerkError?.message
      
      if (errorCode) {
        if (errorCode === 'form_identifier_not_found') {
          setError('No account found with this email address.')
        } else if (errorCode === 'form_password_incorrect') {
          setError('Incorrect password. Please try again.')
        } else if (errorCode === 'form_param_format_invalid') {
          setError('Please enter a valid email address.')
        } else if (errorCode === 'strategy_for_user_invalid') {
          setError('This account was created with Google. Please use "Continue with Google".')
        } else if (errorCode === 'form_password_not_set') {
          setError('No password set. Please use "Continue with Google".')
        } else {
          setError(errorMessage || `Error code: ${errorCode}`)
        }
      } else if (errorMessage) {
        setError(errorMessage)
      } else {
        setError('Sign in failed. Please check your credentials and try again.')
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <PublicOnlyRoute>
      <YStack flex={1} bg="$background">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <YStack 
              gap="$5" 
              flex={1} 
              justify="center" 
              px="$5" 
              pt={insets.top + 40}
              pb={insets.bottom + 40}
              maxW={400} 
              mx="auto" 
              width="100%"
            >
              {/* Logo/Brand */}
              <YStack items="center" gap="$4">
                <YStack 
                  bg="$brand2" 
                  p="$4" 
                  rounded="$10"
                >
                  <Zap size={40} color="$primary" />
                </YStack>
                <DisplayHeading>WELCOME BACK</DisplayHeading>
                <Subtitle>
                  Sign in to continue your training journey
                </Subtitle>
              </YStack>

              {/* OAuth Section */}
              <YStack gap="$4" pt="$2">
                <Button
                  onPress={onOAuthPress}
                  size="$5"
                  bg="white"
                  borderWidth={1}
                  borderColor="#dadce0"
                  fontFamily="$body" fontWeight="500"
                  color="#3c4043"
                  rounded="$3"
                  hoverStyle={{ bg: '#f1f3f4', borderColor: '#c0c4c7' }}
                  pressStyle={{ bg: '#e8eaed', scale: 0.98 }}
                  icon={<GoogleIcon size={20} />}
                  iconAfter={false}
                >
                  Continue with Google
                </Button>

                <XStack items="center" gap="$3">
                  <Divider />
                  <Text 
                    fontSize={12} 
                    color="$color10" 
                    fontFamily="$body" fontWeight="500"
                    letterSpacing={1}
                  >
                    OR
                  </Text>
                  <Divider />
                </XStack>
              </YStack>

              {/* Error Message */}
              {error ? (
                <Card bg="$errorLight" p="$3" rounded="$3">
                  <Text 
                    color="$error" 
                    text="center" 
                    fontSize={14}
                    fontFamily="$body"
                  >
                    {error}
                  </Text>
                </Card>
              ) : null}

              {/* Email/Password Section */}
              <YStack gap="$3">
                <Input
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  value={emailAddress}
                  placeholder="Email address"
                  placeholderTextColor="$placeholderColor"
                  onChangeText={(emailAddress) => {
                    setEmailAddress(emailAddress)
                    setError('')
                  }}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{
                    borderColor: '$primary',
                    borderWidth: 2,
                  }}
                />
                <Input
                  value={password}
                  placeholder="Password"
                  placeholderTextColor="$placeholderColor"
                  secureTextEntry={true}
                  autoComplete="password"
                  returnKeyType="done"
                  onChangeText={(password) => {
                    setPassword(password)
                    setError('')
                  }}
                  onSubmitEditing={onSignInPress}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{
                    borderColor: '$primary',
                    borderWidth: 2,
                  }}
                />
                <Button
                  onPress={onSignInPress}
                  disabled={isSigningIn}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  opacity={isSigningIn ? 0.7 : 1}
                  hoverStyle={{ bg: '#1d4ed8', opacity: 0.95 }}
                  pressStyle={{ bg: '#1e40af', scale: 0.98 }}
                >
                  {isSigningIn ? 'Signing in...' : 'Sign In'}
                </Button>
              </YStack>

              {/* Sign up link */}
              <XStack justify="center" gap="$2" pt="$2">
                <Text fontFamily="$body" color="$color10">
                  Don't have an account?
                </Text>
                <Link href="/sign-up">
                  <Text fontFamily="$body" fontWeight="600" color="$primary" cursor="pointer" hoverStyle={{ opacity: 0.8 }}>
                    Sign up
                  </Text>
                </Link>
              </XStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </PublicOnlyRoute>
  )
}
