# Wander-Fit Development Guidelines

## Keyboard Input Handling

Wrap any screen with input fields in `KeyboardAvoidingView` so the keyboard doesn't hide them:

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

- `behavior="padding"` on iOS only.
- `keyboardShouldPersistTaps="handled"` on the ScrollView, so a tap outside an input dismisses the keyboard.
- Reference implementation: `/app/(auth)/sign-in.tsx`

### Sheet Components with Inputs

For a Tamagui Sheet with input fields, raise the snap point while the keyboard is visible:

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

Every screen accounts for device safe areas (notch, Dynamic Island, home indicator):

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

The app tracks 1RM (One Rep Max) for these core compound lifts, defined in `/convex/userMaxes.ts` (`CORE_LIFT_SLUGS`):

| Slug | Name | Notes |
|------|------|-------|
| `back_squat` | Back Squat | Lower body primary |
| `bench_press` | Bench Press | Upper body push. "Chest press" means Bench Press in this app. |
| `trap_bar_deadlift` | Trap Bar Deadlift | Posterior chain primary |

## Workout Template Naming

Workouts can be reordered, so template names are descriptive and carry no day numbers:

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

### Journeys

- A new journey ships with a new Maestro flow and a feature-map entry in `.cursor/skills/verify-wander-fit/features/`.
- A changed journey updates its flow in the same PR.
- Pure logic needs unit tests only.
- An escaped bug gets a regression flow.
- If the per-PR web suite goes over 10 minutes, the slowest flows move to nightly.

The flow layout and the Maestro findings for this suite are in `.maestro/flow-layout.md`.

### One Test Runner: Jest

Every unit and component test runs under **Jest**, in one run with two projects (`jest.config.js`):

| Project | Directories | File type | Environment |
|---------|-------------|-----------|-------------|
| `node` | `convex/__tests__/`, `lib/__tests__/`, `hooks/__tests__/`, `scripts/**` | `*.test.ts`, `*.test.mjs` | Node, no React Native runtime. TypeScript and ESM go through a plain Babel setup (not `babel.config.js`). |
| `react-native` | `app/**/__tests__/`, `components/**/__tests__/` | `*.test.tsx` | `jest-expo` preset: RN renderer, native module mocks, `babel-preset-expo`. |

- Use the Jest globals (`describe`, `it`, `expect`, `jest.fn()`, `jest.mock()`) with no import. Their types come from `@types/jest` via `"types"` in `tsconfig.json`.
- `expect` takes one argument. To say which case failed inside a loop, put the case in the value, e.g. `expect(missing).toEqual([])`.
- Convex tests that use `convex-test` load the functions with `convexModules()` from `jest/convexModules.ts`, not Vite's `import.meta.glob`.
- A hook test that needs React Native rendering (e.g. `renderHook`) goes next to a component or screen, not in `hooks/__tests__/`.
- Agent worktrees under `.claude/worktrees/` are excluded from Jest and `tsc`.
- A Vitest test from an older branch converts with `node scripts/codemods/vitest-to-jest.mjs <file>`. It is safe to run again, and `--check` lists files that still need it.

### Test File Locations
- **Components**: `components/<component-name>/__tests__/<ComponentName>.test.tsx`
- **Screens**: `app/__tests__/<screen-name>.test.tsx`
- **Lib/Utils**: `lib/__tests__/<module-name>.test.ts`
- **Hook logic**: `hooks/__tests__/<hook-name>.test.ts`
- **Convex functions**: `convex/__tests__/<module-name>.test.ts`

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

### Logic Test Pattern (lib / hooks / convex)

```ts
import { calculateSomething } from '../calculations'

describe('calculateSomething', () => {
  it('returns the expected value', () => {
    expect(calculateSomething(2)).toBe(4)
  })
})
```

### Running Tests
```bash
bun run test                 # every test once (both projects)
bun run test -- <pattern>    # specific files
bun run test:watch           # watch mode
bun run test:ci              # CI mode (jest --ci); the blocking CI job
bun run typecheck            # tsc --noEmit over the whole project, tests included
```

Before opening a PR, `bun run test:ci` and `bun run typecheck` should both pass; CI blocks on both. Bun is the only package manager (`bun install`; the lockfile is `bun.lock`).

**Reference implementations:**
- Component tests: `components/__tests__/RadioButton.test.tsx`
- Screen tests: `app/__tests__/training-science.test.tsx`
- Lib tests: `lib/__tests__/calculations.test.ts`
- Convex tests: `convex/__tests__/userMaxes.test.ts`, and with `convex-test`: `convex/__tests__/authGuards.test.ts`

### Simulator self-check

- Before you ask for review, show the changed journey working in a simulator.
- Iterate on the local simulator.
- Do at most one EAS cloud simulator run per pull request, for the recording. Cap it with `--max-duration-minutes 5` or less, and link the recording in the pull request description. Cloud minutes are scarce: the plan includes 60 a month for everything.
- Never leave a cloud session running. Run `eas simulator:stop` when you finish, even after a failure.
- The simulator check adds to the journey tests under Journeys above; it doesn't replace them. A new journey still ships with a Maestro flow and a feature-map entry, and a changed journey updates its flow.
- How to run both loops: `scripts/sim/README.md`. The cloud run is `npm run sim:cloud-check`.
