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
