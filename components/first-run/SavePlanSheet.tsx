import { useMemo, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, ScrollView, type GestureResponderEvent } from 'react-native'
import { useRouter } from 'expo-router'
import { useClerk, useSignUp, useSSO, useUser } from '@clerk/clerk-expo'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Button, Input, Sheet, Spinner, Text, XStack, YStack } from 'tamagui'
import { Check, Eye, EyeOff } from '@tamagui/lucide-icons'
import { FieldLabel } from '../FieldLabel'
import { VerificationCodeInput } from '../VerificationCodeInput'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { analytics, type AuthMethod } from '../../lib/analytics'
import {
  acceptanceParts,
  acceptanceText,
  HEALTH_DISCLAIMER,
  legalUrl,
  type LegalPage,
} from '../../lib/legal'
import { getSignUpFormErrors, getVerificationErrorMessage } from '../../lib/signUpErrors'
import type { AgeGroup } from '../../types'
import { useSavePlan } from './useSavePlan'

/**
 * Sign in with Apple appears once it's enabled in Clerk and the Apple
 * Developer account. Set EXPO_PUBLIC_APPLE_SIGN_IN=1 in that build.
 */
export const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === '1'

type Step = 'choose' | 'email' | 'code' | 'saving'

const ssoRedirect = () =>
  Platform.OS === 'web'
    ? AuthSession.makeRedirectUri()
    : AuthSession.makeRedirectUri({ scheme: 'myapp', path: 'oauth' })

function PrimaryButton({
  children,
  onPress,
  disabled,
  testID,
}: {
  children: string
  onPress: () => void
  disabled?: boolean
  testID?: string
}) {
  return (
    <Button
      size="$5"
      bg={disabled ? '$color5' : '$primary'}
      color={disabled ? '$color10' : 'white'}
      disabled={disabled}
      onPress={onPress}
      fontFamily="$body"
      fontWeight="700"
      rounded="$4"
      pressStyle={disabled ? undefined : { bg: '$primaryPress', scale: 0.98 }}
      aria-disabled={!!disabled}
      testID={testID}
    >
      {children}
    </Button>
  )
}

function ErrorText({ children, testID }: { children?: string; testID?: string }) {
  if (!children) return null
  return (
    <Text
      fontFamily="$body"
      fontSize={14}
      color="$red11"
      testID={testID}
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  )
}

/**
 * The acceptance checkbox. Athletes 14–17 confirm a parent or legal
 * guardian's permission. Terms, Privacy and the Disclaimer are tappable.
 */
function AcceptanceCheckbox({
  ageGroup,
  checked,
  onChange,
  onOpen,
}: {
  ageGroup: AgeGroup | undefined
  checked: boolean
  onChange: (checked: boolean) => void
  onOpen: (doc: LegalPage | 'disclaimer') => void
}) {
  const toggle = () => onChange(!checked)
  return (
    <XStack gap="$3" items="flex-start" testID="save-plan-acceptance">
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        aria-checked={checked}
        accessibilityLabel={acceptanceText(ageGroup)}
        hitSlop={10}
        testID="save-plan-accept"
        style={{ paddingTop: 1 }}
      >
        <XStack
          width={26}
          height={26}
          rounded="$2"
          borderWidth={2}
          borderColor={checked ? '$primary' : '$color9'}
          bg={checked ? '$primary' : 'transparent'}
          items="center"
          justify="center"
        >
          {checked ? <Check size={18} color="white" strokeWidth={3} /> : null}
        </XStack>
      </Pressable>
      <Text
        flex={1}
        fontFamily="$body"
        fontSize={14}
        lineHeight={20}
        color="$color11"
        onPress={toggle}
      >
        {acceptanceParts(ageGroup).map((part, i) =>
          typeof part === 'string' ? (
            part
          ) : (
            <Text
              key={i}
              fontFamily="$body"
              fontSize={14}
              lineHeight={20}
              fontWeight="600"
              color="$primaryText"
              textDecorationLine="underline"
              accessibilityRole="link"
              testID={`save-plan-link-${part.link}`}
              onPress={(e: GestureResponderEvent) => {
                // The sentence toggles the box; a link only opens its document.
                e?.stopPropagation?.()
                onOpen(part.link)
              }}
            >
              {part.text}
            </Text>
          )
        )}
      </Text>
    </XStack>
  )
}

/** The Health & Fitness Disclaimer, inside the sheet, with a way back. */
function DisclaimerView({ onBack }: { onBack: () => void }) {
  return (
    <YStack gap="$3" testID="save-plan-disclaimer">
      {HEALTH_DISCLAIMER.map((line) => (
        <Text key={line} fontFamily="$body" fontSize={15} lineHeight={22} color="$color12">
          {line}
        </Text>
      ))}
      <PrimaryButton onPress={onBack} testID="save-plan-disclaimer-back">
        Back
      </PrimaryButton>
    </YStack>
  )
}

/**
 * "Save your plan": the account is created and the program saved in one
 * step, after the reveal. No skip, no role question. Closing the sheet keeps
 * the draft, so nothing is lost.
 */
/** The Program tab's first-visit params after the plan is saved. */
export function programWelcomeParams(kept: boolean, nextLabel?: string): Record<string, string> {
  if (kept) return { welcome: '1', kept: '1' }
  return nextLabel ? { welcome: '1', next: nextLabel } : { welcome: '1' }
}

export function SavePlanSheet({
  open,
  onOpenChange,
  nextLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When Day 1 is ("Tomorrow"), for the Program tab's Up next card. */
  nextLabel?: string
}) {
  const router = useRouter()
  const { isLoaded, signUp, setActive } = useSignUp()
  const { startSSOFlow } = useSSO()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { draft, clear } = useFirstRunDraft()
  const savePlan = useSavePlan()

  const [step, setStep] = useState<Step>('choose')
  // The fields are uncontrolled: re-rendering the sheet on every keystroke
  // dropped characters on iOS. The values live here until Create account.
  const fields = useRef({ name: '', email: '', password: '' })
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    general?: string
  }>({})
  const [accountExists, setAccountExists] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // The acceptance checkbox gates every way to an account. Never pre-ticked.
  const [accepted, setAccepted] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const ageGroup = draft?.answers.ageGroup

  const openDocument = (doc: LegalPage | 'disclaimer') => {
    if (doc === 'disclaimer') {
      setDisclaimerOpen(true)
      return
    }
    WebBrowser.openBrowserAsync(legalUrl(doc)).catch((error) =>
      console.error('Opening the page failed:', error)
    )
  }

  const finish = async (
    account: { email?: string; name?: string } = {},
    authMethod: AuthMethod = 'existing_session'
  ) => {
    setStep('saving')
    try {
      const { keptExistingProgram } = await savePlan(account)
      analytics.trackFirstRunCompleted({
        auth_method: authMethod,
        kept_existing_program: keptExistingProgram,
        age_group: draft?.answers.ageGroup,
      })
      // Land on the Program tab. Nothing starts by itself; Day 1 waits there.
      router.replace({
        pathname: '/(athlete)/program',
        params: programWelcomeParams(keptExistingProgram, nextLabel),
      })
      await clear()
    } catch (error) {
      console.error('Saving the plan failed:', error)
      setErrors({ general: "We couldn't save your plan. Check your connection and try again." })
      // The account exists by now, so 'choose' offers "Save to <email>" to retry.
      setStep('choose')
    }
  }

  const onSaveSignedIn = () => {
    if (!accepted) return
    void finish(
      {
        email: fields.current.email.trim() || undefined,
        name: fields.current.name.trim() || undefined,
      },
      'existing_session'
    )
  }

  const onApple = async () => {
    if (!accepted) return
    setErrors({})
    try {
      const result = await startSSOFlow({ strategy: 'oauth_apple', redirectUrl: ssoRedirect() })
      let sessionId = result.createdSessionId
      if (!sessionId && result.signUp) {
        sessionId = (await result.signUp.create({})).createdSessionId
      }
      if (!sessionId) return
      await result.setActive!({ session: sessionId })
      const su = result.signUp
      await finish(
        {
          email: su?.emailAddress ?? undefined,
          name: `${su?.firstName ?? ''} ${su?.lastName ?? ''}`.trim() || undefined,
        },
        'apple'
      )
    } catch (error) {
      console.error('Apple sign-in failed:', error)
      setErrors({ general: "Apple sign-in didn't finish. Try again, or continue with email." })
    }
  }

  const onCreate = async () => {
    if (!isLoaded || !accepted) return
    Keyboard.dismiss()
    const { name, email, password } = fields.current
    const missing = {
      name: name.trim() ? undefined : 'Enter your first name.',
      email: email.trim() ? undefined : 'Enter your email.',
      password: password ? undefined : 'Choose a password of at least 8 characters.',
    }
    setAccountExists(false)
    if (missing.name || missing.email || missing.password) {
      setErrors(missing)
      return
    }
    setBusy(true)
    setErrors({})
    try {
      // The Clerk instance doesn't collect names; the name goes to our users row.
      await signUp.create({ emailAddress: email.trim(), password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setSentTo(email.trim())
      setStep('code')
    } catch (error) {
      const mapped = getSignUpFormErrors(error)
      setErrors({
        email: mapped.email,
        password: mapped.password,
        general: mapped.general || undefined,
      })
      setAccountExists(mapped.accountExists)
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async (value = code) => {
    if (!isLoaded || busy) return
    setBusy(true)
    setErrors({})
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: value })
      if (attempt.status !== 'complete') {
        setErrors({ general: 'Verification could not be completed. Try again.' })
        setCode('')
        return
      }
      await setActive({ session: attempt.createdSessionId })
      await finish(
        { email: fields.current.email.trim(), name: fields.current.name.trim() },
        'email'
      )
    } catch (error) {
      setErrors({ general: getVerificationErrorMessage(error) })
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const onResend = async () => {
    if (!isLoaded) return
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setCode('')
      setErrors({})
    } catch {
      setErrors({ general: "We couldn't resend the code. Try again in a moment." })
    }
  }

  const chooseSnap = APPLE_SIGN_IN_ENABLED || clerkUser ? 58 : 50
  const snapPoints = useMemo(
    () => [step === 'choose' && !disclaimerOpen ? chooseSnap : 90],
    [step, chooseSnap, disclaimerOpen]
  )

  const close = (next: boolean) => {
    if (step === 'saving') return
    onOpenChange(next)
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={close}
      // Steps with inputs open tall enough to sit above the keyboard, so the
      // sheet doesn't jump (and move the field being tapped) when it opens.
      snapPoints={snapPoints}
      dismissOnSnapToBottom={step !== 'saving'}
    >
      <Sheet.Overlay
        bg="rgba(15, 23, 42, 0.45)"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        animation="quick"
      />
      <Sheet.Frame
        p="$5"
        bg="$background"
        maxW={560}
        self="center"
        width="100%"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        testID="save-plan-sheet"
      >
        <Sheet.Handle />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <YStack gap="$4" pt="$3" pb="$6">
            <YStack gap="$1.5">
              <Text
                fontFamily="$body"
                fontSize={24}
                fontWeight="700"
                color="$color12"
                accessibilityRole="header"
              >
                {disclaimerOpen
                  ? 'Health & Fitness Disclaimer'
                  : step === 'code'
                    ? 'Check your email'
                    : 'Save your plan'}
              </Text>
              {disclaimerOpen ? null : (
                <Text fontFamily="$body" fontSize={16} color="$color11">
                  {step === 'code'
                    ? `Enter the 6-digit code we sent to ${sentTo}.`
                    : "So it's here tomorrow."}
                </Text>
              )}
            </YStack>

            {disclaimerOpen ? <DisclaimerView onBack={() => setDisclaimerOpen(false)} /> : null}

            <ErrorText testID="save-plan-error">{errors.general}</ErrorText>

            {step === 'saving' ? (
              <XStack gap="$3" items="center" py="$4" testID="save-plan-saving">
                <Spinner color="$primaryText" />
                <Text fontFamily="$body" fontSize={16} color="$color12">
                  Saving your plan…
                </Text>
              </XStack>
            ) : null}

            {step === 'choose' && !disclaimerOpen ? (
              <AcceptanceCheckbox
                ageGroup={ageGroup}
                checked={accepted}
                onChange={setAccepted}
                onOpen={openDocument}
              />
            ) : null}

            {step === 'choose' && !disclaimerOpen && clerkUser ? (
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize={15}
                  color="$color11"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  Signed in as {clerkUser.primaryEmailAddress?.emailAddress ?? 'your account'}
                </Text>
                <PrimaryButton
                  onPress={onSaveSignedIn}
                  disabled={!accepted}
                  testID="save-plan-signed-in"
                >
                  Save to this account
                </PrimaryButton>
                <Text
                  fontFamily="$body"
                  fontSize={14}
                  fontWeight="600"
                  color="$primaryText"
                  accessibilityRole="button"
                  onPress={() => void signOut()}
                  self="center"
                  py="$2"
                  testID="save-plan-switch-account"
                >
                  Use a different account
                </Text>
              </YStack>
            ) : null}

            {step === 'choose' && !disclaimerOpen && !clerkUser ? (
              <YStack gap="$3">
                {APPLE_SIGN_IN_ENABLED ? (
                  <Button
                    size="$5"
                    bg={accepted ? '$color12' : '$color5'}
                    color={accepted ? '$background' : '$color10'}
                    fontFamily="$body"
                    fontWeight="700"
                    rounded="$4"
                    pressStyle={accepted ? { scale: 0.98 } : undefined}
                    disabled={!accepted}
                    aria-disabled={!accepted}
                    onPress={onApple}
                    testID="save-plan-apple"
                  >
                    Continue with Apple
                  </Button>
                ) : null}
                <PrimaryButton
                  onPress={() => {
                    if (accepted) setStep('email')
                  }}
                  disabled={!accepted}
                  testID="save-plan-email"
                >
                  Continue with email
                </PrimaryButton>
              </YStack>
            ) : null}

            {step === 'email' ? (
              <YStack gap="$3">
                <YStack gap="$1.5">
                  <FieldLabel htmlFor="save-plan-name">First name</FieldLabel>
                  <Input
                    id="save-plan-name"
                    nativeID="save-plan-name"
                    testID="save-plan-name"
                    accessibilityLabel="First name"
                    defaultValue={fields.current.name}
                    onChangeText={(text) => {
                      fields.current.name = text
                    }}
                    autoComplete="given-name"
                    textContentType="givenName"
                    size="$5"
                    fontFamily="$body"
                    fontSize={16}
                    borderColor={errors.name ? '$red8' : '$borderColor'}
                  />
                  <ErrorText>{errors.name}</ErrorText>
                </YStack>
                <YStack gap="$1.5">
                  <FieldLabel htmlFor="save-plan-email-input">Email</FieldLabel>
                  <Input
                    id="save-plan-email-input"
                    nativeID="save-plan-email-input"
                    testID="save-plan-email-input"
                    accessibilityLabel="Email"
                    defaultValue={fields.current.email}
                    onChangeText={(text) => {
                      fields.current.email = text
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    size="$5"
                    fontFamily="$body"
                    fontSize={16}
                    borderColor={errors.email ? '$red8' : '$borderColor'}
                  />
                  <ErrorText>{errors.email}</ErrorText>
                  {accountExists ? (
                    <Text
                      fontFamily="$body"
                      fontSize={14}
                      fontWeight="600"
                      color="$primaryText"
                      accessibilityRole="link"
                      onPress={() => {
                        onOpenChange(false)
                        router.push('/(auth)/sign-in')
                      }}
                      testID="save-plan-sign-in"
                    >
                      Sign in instead
                    </Text>
                  ) : null}
                </YStack>
                <YStack gap="$1.5">
                  <FieldLabel htmlFor="save-plan-password">Password</FieldLabel>
                  <XStack position="relative">
                    <Input
                      id="save-plan-password"
                      nativeID="save-plan-password"
                      testID="save-plan-password"
                      accessibilityLabel="Password"
                      defaultValue={fields.current.password}
                      onChangeText={(text) => {
                        fields.current.password = text
                      }}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      size="$5"
                      fontFamily="$body"
                      fontSize={16}
                      flex={1}
                      pr="$10"
                      borderColor={errors.password ? '$red8' : '$borderColor'}
                    />
                    <XStack
                      position="absolute"
                      r="$2"
                      t={0}
                      b={0}
                      width={44}
                      items="center"
                      justify="center"
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      cursor="pointer"
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="$color10" />
                      ) : (
                        <Eye size={20} color="$color10" />
                      )}
                    </XStack>
                  </XStack>
                  <ErrorText>{errors.password}</ErrorText>
                </YStack>
                <PrimaryButton
                  onPress={onCreate}
                  disabled={busy || !accepted}
                  testID="save-plan-create"
                >
                  {busy ? 'Creating account…' : 'Create account'}
                </PrimaryButton>
              </YStack>
            ) : null}

            {step === 'code' ? (
              <YStack gap="$4">
                <VerificationCodeInput
                  value={code}
                  onChange={(value) => {
                    setCode(value)
                    if (value.length === 6) void onVerify(value)
                  }}
                  length={6}
                  firstInputId="save-plan-code"
                />
                <PrimaryButton
                  onPress={() => void onVerify()}
                  disabled={busy || code.length < 6}
                  testID="save-plan-verify"
                >
                  {busy ? 'Saving…' : 'Verify and save'}
                </PrimaryButton>
                <Text
                  fontFamily="$body"
                  fontSize={14}
                  fontWeight="600"
                  color="$primaryText"
                  text="center"
                  accessibilityRole="button"
                  onPress={onResend}
                  testID="save-plan-resend"
                >
                  Resend code
                </Text>
                {busy ? null : (
                  // Hidden while verifying, so a late success can't save to the old address
                  <Text
                    fontFamily="$body"
                    fontSize={14}
                    fontWeight="600"
                    color="$primaryText"
                    text="center"
                    accessibilityRole="button"
                    onPress={() => {
                      setCode('')
                      setErrors({})
                      setStep('email')
                    }}
                    testID="save-plan-change-email"
                  >
                    Change email
                  </Text>
                )}
              </YStack>
            ) : null}
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
