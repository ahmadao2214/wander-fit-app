import React, { useCallback, useEffect } from 'react'
import { useSignIn, useSSO } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Platform, ScrollView } from 'react-native'
import { Text, Input, Button, YStack, XStack } from 'tamagui'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { PublicOnlyRoute } from '../../components/AuthGuard'

// Custom hook for warming up browser on Android
export const useWarmUpBrowser = () => {
    useEffect(() => {
        // Preloads the browser for Android devices to reduce authentication load time
        // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
        Platform.OS === 'android' && void WebBrowser.warmUpAsync()
        return () => {
            // Cleanup: closes browser when component unmounts
            Platform.OS === 'android' && void WebBrowser.coolDownAsync()
        }
    }, [])
}

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession()

export default function Page() {
    useWarmUpBrowser()

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
            // Start the authentication process by calling `startSSOFlow()`
            const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
                strategy: 'oauth_google',
                // For web, defaults to current path
                // For native, you must pass a scheme, like AuthSession.makeRedirectUri({ scheme, path })
                redirectUrl: Platform.OS === 'web'
                    ? AuthSession.makeRedirectUri()
                    : Platform.OS === 'ios' || Platform.OS === 'android'
                        ? AuthSession.makeRedirectUri({
                            scheme: 'myapp',
                            path: 'oauth'
                        })
                        : undefined,
            })

            // If sign in was successful, set the active session
            if (createdSessionId) {
                setActive!({
                    session: createdSessionId,
                    navigate: async () => {
                        // Use same navigation logic as email/password sign-in
                        if (Platform.OS !== 'web') {
                            console.log('OAuth Mobile: Adding delay for auth state sync')
                            setTimeout(() => {
                                console.log('OAuth Mobile: Delayed navigation to /')
                                router.replace('/')
                            }, 500)
                        } else {
                            router.replace('/')
                        }
                    },
                })
            } else {
                // If there is no `createdSessionId`,
                // there are missing requirements, such as MFA
                // Use the `signIn` or `signUp` returned from `startSSOFlow`
                // to handle next steps
                console.log('Additional steps required:', signIn || signUp)
                
                // Check if this is a sign-up scenario (new user)
                if (signUp) {
                    console.log('New user detected, redirecting to sign-up')
                    router.push('/(auth)/sign-up')
                }
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error('OAuth Error:', JSON.stringify(err, null, 2))
        }
    }, [startSSOFlow, router])

    // Handle the submission of the sign-in form
    const onSignInPress = async () => {
        if (!isLoaded) return

        // Clear any previous errors
        setError('')
        setIsSigningIn(true)

        // Start the sign-in process using the email and password provided
        try {
            const signInAttempt = await signIn.create({
                identifier: emailAddress,
                password,
            })

            console.log('signInAttempt status:', signInAttempt.status)

            // If sign-in process is complete, set the created session as active
            // and redirect the user
            if (signInAttempt.status === 'complete') {
                console.log('Setting active session with ID:', signInAttempt.createdSessionId)
                await setActive({ session: signInAttempt.createdSessionId })
                console.log('Session set, attempting to navigate to /')
                
                // Add small delay on mobile for auth state to sync
                if (Platform.OS !== 'web') {
                    console.log('Mobile: Adding delay for auth state sync')
                    setTimeout(() => {
                        console.log('Mobile: Delayed navigation to /')
                        router.replace('/')
                    }, 500)
                } else {
                    router.replace('/')
                }
                console.log('Navigation called')
            } else if (signInAttempt.status === 'needs_second_factor') {
                // User has 2FA enabled - they need to complete second factor
                console.log('2FA required, supported factors:', signInAttempt.supportedSecondFactors)
                setError('Two-factor authentication is enabled on this account. Please disable 2FA in Clerk Dashboard for testing, or use "Continue with Google".')
            } else if (signInAttempt.status === 'needs_first_factor') {
                // Need to complete first factor (shouldn't happen with password, but handle it)
                console.log('First factor required')
                setError('Additional verification required. Please try "Continue with Google".')
            } else {
                // If the status isn't complete, check why. User might need to
                // complete further steps.
                console.log('Sign in status:', signInAttempt.status)
                setError(`Sign in incomplete (status: ${signInAttempt.status}). Please try again or use a different method.`)
            }
        } catch (err: any) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // Clerk error objects have circular references, so we can't JSON.stringify them directly
            console.error('Sign-in error:', err?.message || err)
            
            // Extract user-friendly error message from Clerk error
            // Clerk errors are typically in err.errors[] array
            const clerkError = err?.errors?.[0]
            const errorCode = clerkError?.code || err?.code
            const errorMessage = clerkError?.longMessage || clerkError?.message
            
            if (errorCode) {
                // Common Clerk error codes
                if (errorCode === 'form_identifier_not_found') {
                    setError('No account found with this email address.')
                } else if (errorCode === 'form_password_incorrect') {
                    setError('Incorrect password. Please try again.')
                } else if (errorCode === 'form_param_format_invalid') {
                    setError('Please enter a valid email address.')
                } else if (errorCode === 'strategy_for_user_invalid') {
                    setError('This account was created with Google. Please use "Continue with Google" to sign in.')
                } else if (errorCode === 'form_password_not_set') {
                    setError('No password set for this account. Please use "Continue with Google" or reset your password.')
                } else {
                    // Show the actual error for debugging
                    setError(errorMessage || `Error code: ${errorCode}`)
                }
            } else if (errorMessage) {
                setError(errorMessage)
            } else {
                // Last resort
                setError('Sign in failed. Please check your credentials and try again.')
            }
        } finally {
            setIsSigningIn(false)
        }
    }

    return (
        <PublicOnlyRoute>
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <YStack gap="$4" flex={1} justify="center" px="$4" py="$6" maxW={400} mx="auto" width="100%">
                    <YStack gap="$2" items="center">
                        <Text fontSize="$8" fontWeight="bold">Sign in</Text>
                        <Text text="center">
                            Welcome back! Please sign in to your account.
                        </Text>
                    </YStack>

                    {/* OAuth Section */}
                    <YStack gap="$3">
                        <Button
                            onPress={onOAuthPress}
                            theme="red"
                            fontWeight="600"
                            size="$4"
                        >
                            Continue with Google
                        </Button>

                        <XStack items="center" gap="$3">
                            <Text fontSize="$3">OR</Text>
                        </XStack>
                    </YStack>

                    {/* Error Message */}
                    {error ? (
                        <YStack bg="$red2" p="$3" rounded="$3">
                            <Text color="$red10" text="center">{error}</Text>
                        </YStack>
                    ) : null}

                    {/* Email/Password Section */}
                    <YStack gap="$3">
                        <Input
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            returnKeyType="next"
                            value={emailAddress}
                            placeholder="Enter email"
                            onChangeText={(emailAddress) => {
                                setEmailAddress(emailAddress)
                                setError('') // Clear error when user types
                            }}
                            size="$4"
                        />
                        <Input
                            value={password}
                            placeholder="Enter password"
                            secureTextEntry={true}
                            autoComplete="password"
                            returnKeyType="done"
                            onChangeText={(password) => {
                                setPassword(password)
                                setError('') // Clear error when user types
                            }}
                            onSubmitEditing={onSignInPress}
                            size="$4"
                        />
                        <Button
                            onPress={onSignInPress}
                            disabled={isSigningIn}
                            theme="blue"
                            fontWeight="600"
                            size="$4"
                            opacity={isSigningIn ? 0.7 : 1}
                        >
                            {isSigningIn ? 'Signing in...' : 'Continue'}
                        </Button>
                    </YStack>

                    <XStack justify="center" gap="$2">
                        <Text>Don't have an account?</Text>
                        <Link href="/sign-up">
                            <Text fontWeight="600">Sign up</Text>
                        </Link>
                    </XStack>
                </YStack>
            </ScrollView>
        </PublicOnlyRoute>
    )
}