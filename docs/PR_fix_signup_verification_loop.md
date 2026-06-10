# Fix: Sign-Up Verification Screen Flickers / Loops After Entering Code

## Summary

When demoing the app, the new-account email verification screen "vibrates and flashes back and forth" after the 6-digit code is entered, and the user is never advanced past the verification step. This has reproduced twice during live demos.

The cause is an **infinite auto-submit loop** in [app/(auth)/sign-up.tsx](app/(auth)/sign-up.tsx) combined with **silent error swallowing** in the verification handler. Any non-success outcome (wrong code, expired code, Clerk error, Convex `createUser` failure) leaves the 6-digit `code` state intact while `isCreatingUser` flips back to `false`, which immediately re-fires the auto-submit effect — producing the visible re-render / keyboard / button-press flicker.

## Root Cause

### 1. Auto-submit effect re-fires forever on failure

[app/(auth)/sign-up.tsx:266-270](app/(auth)/sign-up.tsx:266)

```tsx
React.useEffect(() => {
  if (code.length === 6 && pendingVerification && !isCreatingUser) {
    onVerifyPress()
  }
}, [code, pendingVerification, isCreatingUser])
```

`isCreatingUser` is in the dependency array. The flow is:

1. User types 6th digit → effect fires → `onVerifyPress()` sets `isCreatingUser = true`.
2. `signUp.attemptEmailAddressVerification` rejects (bad/expired code) **or** `signUpAttempt.status !== 'complete'` **or** `createUser` mutation throws.
3. `finally` block sets `isCreatingUser = false`.
4. Effect dependencies changed (`isCreatingUser: true → false`), `code` is still length 6, `pendingVerification` is still true → effect fires **again** immediately.
5. Loop repeats indefinitely, re-rendering the screen and re-triggering keyboard / focus side-effects in `VerificationCodeInput` — the visible "vibration."

### 2. Errors are never surfaced to the UI

[app/(auth)/sign-up.tsx:328-335](app/(auth)/sign-up.tsx:328)

```tsx
} else {
  console.error(JSON.stringify(signUpAttempt, null, 2))
}
} catch (err) {
  console.error(JSON.stringify(err, null, 2))
} finally {
  setIsCreatingUser(false)
}
```

No `setError(...)` call, no field-level error, no toast. The user has no idea why the screen is stuck and the demo presenter has no signal to recover.

### 3. Convex `createUser` failure falls through to `/`

[app/(auth)/sign-up.tsx:324-327](app/(auth)/sign-up.tsx:324) — if Clerk verification succeeds but the Convex `createUser` mutation throws, control routes to `/`. `AuthGuard` then sees a signed-in Clerk session with no Convex record and bounces back to `/sign-up?needsSetup=true`, which can also present as flashing on slow networks.

## Reproduction

1. Launch the app, go to **Create account**.
2. Enter name, email, password → **Continue with Email**.
3. Receive 6-digit code in email.
4. Enter the code in the 6-box input.
5. Expected: account is created and the user is routed to `/(client)` or `/(trainer)`.
6. Actual: the screen flashes / "vibrates" repeatedly, the keyboard may flicker, no error message appears, and the screen never advances. Console shows repeated `verification_failed` / `form_code_incorrect` errors fired on a tight loop.

Common ways to trigger the bad branch on a real demo:
- Typo in the last digit (auto-submit fires before the user can correct it).
- Code expired (Clerk codes expire quickly; entering after a delay during a demo is realistic).
- Transient Convex write failure right after Clerk verifies successfully.

## Proposed Fix

### A. Guard the auto-submit effect so it only fires once per code

Track the last code we attempted and don't retry the same code. Also remove `isCreatingUser` from the dependency array.

```tsx
const lastAttemptedCodeRef = React.useRef<string>('')

React.useEffect(() => {
  if (
    code.length === 6 &&
    pendingVerification &&
    !isCreatingUser &&
    lastAttemptedCodeRef.current !== code
  ) {
    lastAttemptedCodeRef.current = code
    onVerifyPress()
  }
}, [code, pendingVerification])
```

### B. Surface verification errors in the UI

In `onVerifyPress`, handle the failure branches explicitly:

```tsx
} catch (err: any) {
  const clerkErrors = err?.errors
  if (clerkErrors?.length) {
    const firstError = clerkErrors[0]
    if (firstError.code === 'form_code_incorrect') {
      setError('That code is incorrect. Please try again.')
    } else if (firstError.code === 'verification_expired') {
      setError('Code expired. Tap Resend to get a new one.')
    } else {
      setError(firstError.longMessage || firstError.message || 'Verification failed.')
    }
  } else {
    setError('Verification failed. Please try again.')
  }
  setCode('') // clear so user can retype and re-trigger the effect
  lastAttemptedCodeRef.current = ''
} finally {
  setIsCreatingUser(false)
}
```

And render an error card on the verification screen (mirroring the one on the main sign-up screen at lines 601-607):

```tsx
{error ? (
  <Card bg="$errorLight" p="$3" rounded="$3">
    <Text color="$error" text="center" fontSize={14} fontFamily="$body">
      {error}
    </Text>
  </Card>
) : null}
```

### C. Don't swallow Convex `createUser` failures

If Clerk verifies but Convex fails, surface it instead of routing to `/`:

```tsx
} catch (convexErr) {
  console.error('Failed to create user in Convex:', convexErr)
  setError('Account verified but profile setup failed. Please try again.')
  return
}
```

### D. (Optional hardening) Disable the manual **Verify & Continue** button until `code.length === 6`

Currently the button is only disabled while `isCreatingUser`, so it can be pressed with a partial code, producing yet another error path.

```tsx
disabled={isCreatingUser || code.length !== 6}
```

## Files Changed

- `app/(auth)/sign-up.tsx` — fixes A–D above.
- `components/__tests__/sign-up-verification.test.tsx` — new tests (see below).

## Tests (required per CLAUDE.md)

Add `app/__tests__/sign-up-verification.test.tsx` covering:

1. Auto-submit fires exactly once when 6 digits are entered.
2. After a failed verification (`form_code_incorrect`), the same code does **not** auto-resubmit; an error message renders.
3. After a failed verification, clearing and re-entering 6 digits **does** trigger a new attempt.
4. Successful verification calls `setActive` and `createUser` and routes to the role-appropriate stack.
5. Convex `createUser` failure surfaces an error and does not route away.

Mock `@clerk/clerk-expo`'s `useSignUp`, `convex/react`'s `useMutation`/`useQuery`, and `expo-router`'s `useRouter` per the patterns in `CLAUDE.md`.

## Test Plan (manual, before merge)

- [ ] Happy path: real email, correct code → routed to `/(client)` or `/(trainer)`.
- [ ] Wrong code: error card appears, screen does not flicker, button re-enables.
- [ ] Expired code (wait ~10 min before submitting): error card appears, **Resend** works, new code succeeds.
- [ ] Slow network: only one verification request is sent (verify in Clerk dashboard / network log) — no retry storm.
- [ ] iOS + Android + Web all behave the same.

## Risk

Low. Changes are localized to the verification branch of one screen. No schema, no Convex, no auth-provider changes.
