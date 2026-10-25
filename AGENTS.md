# Wander-Fit Development Guidelines

## Keyboard Input Handling

When creating screens with input fields, always wrap content with `KeyboardAvoidingView` to prevent inputs from being hidden by the keyboard:

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native'

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  style={{ flex: 1 }}
  enabled={Platform.OS === 'ios'}
>
  <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ flexGrow: 1 }}
  >
    {/* Your content with inputs */}
  </ScrollView>
</KeyboardAvoidingView>
```

**Key points:**
- Use `behavior="padding"` on iOS only
- Add `keyboardShouldPersistTaps="handled"` to ScrollView so taps outside inputs dismiss keyboard
- Reference implementation: `/app/(auth)/sign-in.tsx`

### Sheet Components with Inputs

For Tamagui Sheet components containing input fields, adjust snap points when keyboard is visible:

```tsx
import { Keyboard, Platform } from 'react-native'

const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

useEffect(() => {
  if (Platform.OS === 'web') return
  const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true))
  const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false))
  return () => { showSub.remove(); hideSub.remove() }
}, [])

const snapPoints = isKeyboardVisible ? [85] : [55]

<Sheet snapPoints={snapPoints}>
  <Sheet.Frame>
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* content with inputs */}
    </ScrollView>
  </Sheet.Frame>
</Sheet>
```

Reference implementation: `/components/workout/SetEditSheet.tsx`

## Safe Area Insets

All screens must account for device safe areas (notch, Dynamic Island, home indicator):

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Inside component:
const insets = useSafeAreaInsets()

// Header padding:
pt={insets.top + 16}  // 16px additional padding below safe area

// Footer/bottom padding:
pb={insets.bottom + 16}  // 16px additional padding above home indicator
```

**Reference implementations:**
- Header with safe area: `/app/(athlete)/workout/[id].tsx`
- Execution screen: `/app/(athlete)/workout/execute/[id].tsx`

## 1RM Core Lifts

The app tracks 1RM (One Rep Max) for these core compound lifts:

| Slug | Name | Notes |
|------|------|-------|
| `back_squat` | Back Squat | Lower body primary |
| `bench_press` | Bench Press | Upper body push (covers "chest press") |
| `trap_bar_deadlift` | Trap Bar Deadlift | Posterior chain primary |

Defined in: `/convex/userMaxes.ts` (`CORE_LIFT_SLUGS`)

**Note:** "Chest press" refers to Bench Press in this app.

## Workout Template Naming

Templates should use descriptive names without day numbers since workouts can be reordered:

**Good:**
- "Lower Body Foundation"
- "Upper Push/Pull"
- "Power & Conditioning"

**Avoid:**
- "Lower Body Foundation - Day 1"
- "Day 2: Upper Body"

## Component Patterns

### Tamagui Stack Components
Use `YStack` for vertical layouts, `XStack` for horizontal:
```tsx
<YStack gap="$4" px="$4">
  <XStack items="center" justify="space-between">
    {/* content */}
  </XStack>
</YStack>
```

The Tamagui v4 config sets `onlyAllowShorthands: true`, so longhand style props that have a shorthand **don't typecheck** (they still work at runtime, which is how they slip in). Use `items`/`justify`/`self`/`content` (align/justify), `bg`, `rounded`, `text` (textAlign), `p*`/`m*`, `t`/`b`/`l`/`r`, `z`, `minW`/`maxW`/`minH`/`maxH`, `grow`/`shrink`. Colors passed through variables or helpers should be typed `ColorTokens` (from `tamagui`), not `string`.

### Loading States
```tsx
if (data === undefined) {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4">
      <Spinner size="large" color="$primary" />
      <Text>Loading...</Text>
    </YStack>
  )
}
```

## Convex Patterns

### Queries with auth check
```tsx
const data = useQuery(
  api.module.queryName,
  user ? { /* args */ } : "skip"
)
```

### Mutations with loading state
```tsx
const [isLoading, setIsLoading] = useState(false)
const mutation = useMutation(api.module.mutationName)

const handleAction = async () => {
  setIsLoading(true)
  try {
    await mutation({ /* args */ })
  } catch (error) {
    console.error('Failed:', error)
  } finally {
    setIsLoading(false)
  }
}
```

## Testing Requirements

**All new features must include unit tests.** This is a mandatory requirement for any PR.

### Two Test Runners: Jest vs Vitest

The repo uses **two** test runners, split by directory. Each runner only collects its own directories, so never mix them in one folder.

| Runner | Directories | File type | Why |
|--------|-------------|-----------|-----|
| **Jest** (`jest-expo` preset) | `app/**/__tests__/`, `components/**/__tests__/` | `*.test.tsx` | Renders React Native components; needs the jest-expo preset (RN renderer, native module mocks, Babel). |
| **Vitest** (node env) | `convex/__tests__/`, `lib/__tests__/`, `hooks/__tests__/` | `*.test.ts` | Pure TypeScript logic (Convex functions, utilities, hook logic); fast, no RN runtime. |

- Config: `jest.config.js` (`testMatch`) and `vitest.config.ts` (`include`). Keep the two lists disjoint.
- **Jest files** use Jest globals (`describe`, `it`, `expect`, `jest.fn()`, `jest.mock()`) with no import; their types come from `@types/jest` via `"types"` in `tsconfig.json`.
- **Vitest files** must import the API explicitly: `import { describe, it, expect, vi } from 'vitest'` (Vitest `globals` is off). Use `vi.fn()`, never `jest.fn()`.
- Why it matters: a Vitest file collected by Jest fails with *"Vitest cannot be imported in a CommonJS module using require()"*, and a Jest file collected by Vitest can't load React Native.
- Testing a hook that needs React Native rendering (e.g. `renderHook`)? Put that test next to a component/screen under Jest instead of in `hooks/__tests__/`.
- Agent worktrees under `.claude/worktrees/` are excluded from Jest, Vitest and `tsc`.

### Test File Locations
- **Components** (Jest): `components/<component-name>/__tests__/<ComponentName>.test.tsx`
- **Screens** (Jest): `app/__tests__/<screen-name>.test.tsx`
- **Lib/Utils** (Vitest): `lib/__tests__/<module-name>.test.ts`
- **Hook logic** (Vitest): `hooks/__tests__/<hook-name>.test.ts`
- **Convex functions** (Vitest): `convex/__tests__/<module-name>.test.ts`

### Test Setup Pattern (Jest component/screen test)

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('ComponentName', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ComponentName />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Expected text')).toBeTruthy()
  })
})
```

### Mocking Common Dependencies

```tsx
// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}))

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

// Mock Safe Area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

// Mock Auth
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isLoading: false,
  }),
}))
```

### What to Test
- Component renders without crashing
- User interactions (press, input changes)
- Conditional rendering based on props/state
- Loading and error states
- Data transformations and business logic

### Vitest Setup Pattern (lib / hooks / convex test)

```ts
import { describe, it, expect } from 'vitest'
import { calculateSomething } from '../calculations'

describe('calculateSomething', () => {
  it('returns the expected value', () => {
    expect(calculateSomething(2)).toBe(4)
  })
})
```

### Running Tests
```bash
npm test                     # Jest in watch mode (components + screens)
npm test -- <pattern>        # Jest, specific files
npm run test:ci              # Jest once, CI mode (jest --ci)
npm run test:unit            # Vitest once (convex + lib + hooks)
npx vitest <pattern>         # Vitest watch mode, specific files
npm run typecheck            # tsc --noEmit over the whole project, tests included
```

Before opening a PR, `npm run test:ci`, `npm run test:unit` and `npm run typecheck` should all pass. Dependencies are installed with Bun (`bun install`; the lockfile is `bun.lock`).

**Reference implementations:**
- Component tests (Jest): `components/__tests__/RadioButton.test.tsx`
- Screen tests (Jest): `app/__tests__/training-science.test.tsx`
- Lib tests (Vitest): `lib/__tests__/calculations.test.ts`
- Convex tests (Vitest): `convex/__tests__/userMaxes.test.ts`

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
