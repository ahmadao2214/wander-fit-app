# Equipment Toggle Feature Plan

## Audience 1: Product Review

### What problem this solves

Today the app makes users choose between two imperfect experiences:

1. Athletes training at home often see gym-dependent exercises they cannot do as written.
2. Athletes training in a gym often still get highly plyometric or bodyweight-biased power work when they would prefer equipment-based conditioning options.
3. The product has no explicit way to capture or persist "I train at a gym" vs "I train at home with minimal equipment."

The most visible example is Power Day. It currently leans too hard toward jumps and plyometrics, even in cases where a gym athlete would likely prefer sleds, ropes, bikes, or ergs.

### Product decision

Add a global `Gym / Home` equipment preference that can be:

1. Chosen during intake.
2. Updated later in Settings.
3. Toggled from the workout detail screen before starting a workout.

When the athlete changes the mode, the workout should swap each exercise to the best available alternative for that environment. If no good alternative exists, we leave the original exercise unchanged instead of forcing a poor substitution.

### Why this is the right product move

This approach improves the product on three fronts:

1. Better fit for real training environments.
2. Fewer frustrating "I cannot do this here" moments.
3. Better power-day experience for gym athletes without creating separate workout programs.

It also avoids maintaining two completely different template libraries. We keep one program design system and adapt exercises within it.

### What the user experience will feel like

#### Intake

We add one question to the existing setup flow:

- `Gym`: "I have access to a full gym."
- `Home`: "I train at home with minimal equipment."

This sets the athlete's default experience from day one.

#### Settings

The athlete can change their default environment later from App Settings.

#### Workout detail

On the workout detail screen, the athlete can toggle `Gym` or `Home` before starting the workout.

- Exercises that have a good alternative swap immediately.
- Exercises with no good match stay as-is.
- We persist the preference so future workouts open in the same mode.

#### Workout execution

Once the workout starts, the environment is locked for that session. We show it as an informational badge only. This keeps the session stable and avoids changing prescriptions mid-workout.

### How the matching works at a product level

We are not proposing manual one-to-one mappings for the whole exercise library.

Instead, we use the exercise tags we already maintain, such as:

- `push`
- `pull`
- `squat`
- `hinge`
- `lunge`
- `carry`
- `rotation`
- `horizontal`
- `vertical`
- `bilateral`
- `unilateral`

Those tags form a movement signature. Exercises with similar signatures are treated as good alternatives.

Example:

| Original | Likely alternative | Why it works |
|---|---|---|
| Bench Press | Push-Up | Same horizontal push pattern |
| DB Bench Press | Push-Up | Same horizontal push pattern |
| Gym-only power option | Bodyweight or minimal-gear option | Same training intent, different environment |

For cases where the algorithm picks the wrong swap, we will support a manual override in the exercise data.

### Power Day improvement

This feature directly addresses the current Power Day concern by allowing gym-oriented conditioning alternatives. Initial examples:

| Current default | Gym-oriented alternative |
|---|---|
| Box Jump | Sled Push |
| Broad Jump | Assault Bike Sprint |
| Jump Squat | Trap Bar Jump Squat |
| Lateral Bound | Ski Erg Sprint |
| Med Ball Slam | Battle Rope Slams |

These are examples for review, not hard-coded final decisions. The audit step below is where we validate them before implementation continues.

### New exercises we likely need

To make the gym mode feel complete, we should seed a small set of missing conditioning movements:

1. Battle Rope Slams
2. Battle Rope Waves
3. Ski Erg Sprint
4. Assault Bike Sprint
5. Stair Climber Sprint
6. Curve/Woodway Sprint

We already have sled and farmer's carry style movements, so this is a focused addition rather than a large exercise-library rewrite.

### Product decisions to approve

These are the decisions that matter most for product review:

1. Use a single program with environment-based swaps, not separate gym and home programs.
2. Store equipment preference globally per athlete.
3. Allow pre-workout toggling, but not mid-workout toggling.
4. Leave unmatched exercises unchanged instead of forcing weak substitutions.
5. Use tag-based matching as the default system, with manual overrides only when needed.

### Delivery plan

We will ship this in 4 stacked PRs so each stage is reviewable:

1. Foundation: schema changes, missing exercises, audit report.
2. Backend: matching engine and persisted equipment preference.
3. Workout UI: workout detail toggle, swap display, execution badge.
4. Intake + Settings: user preference capture and update flows.

### Main risks

1. Some exercises may not have a clean equivalent across environments.
2. Tag quality may be inconsistent for certain movements.
3. Power-day swaps may be technically valid but still not feel like the best coaching decision.

That is why PR 1 includes an audit report before we commit to the full feature build.

### Recommendation

Proceed with the 4-PR rollout and treat the exercise audit as the product checkpoint. That gives us one shared review artifact before the bulk of the implementation work lands.

---

## Audience 2: Engineering Appendix

### Goal

Implement equipment-aware workout variants without duplicating the program template system.

The design goal is:

1. Keep one source of truth for templates.
2. Compute or preload exercise alternatives per workout.
3. Persist the athlete's environment preference.
4. Snapshot the active mode when a workout session starts.

## Skills and implementation lanes used in this plan

This plan crosses a few distinct implementation skill areas. Calling them out explicitly helps us review the work by the right lens in each PR:

1. `Convex`: schema design, query/mutation updates, session snapshotting, and exercise-matching data flow.
2. `Convex schema validation`: new validators and safe additions to `schema.ts` for `equipmentMode` and override fields.
3. `React Native architecture`: state flow between intake, settings, workout detail, and execution without creating duplicate workout logic.
4. `Expo / app UI design`: the intake card selection, settings surface, shared toggle, and workout-level toggle UX.
5. `React Native testing`: TDD for matching logic, persistence, screen behavior, and toggle-driven rendering changes.

We should use these as the primary review lenses across the stacked PRs:

1. PR 1 leans hardest on `Convex` and `Convex schema validation`.
2. PR 2 leans hardest on `Convex` plus backend-focused testing.
3. PR 3 leans hardest on `React Native architecture` and integration-style UI testing.
4. PR 4 leans hardest on `Expo / app UI design`, `React Native architecture`, and screen/component tests.

## Current state

### 1. Intake completion does not store equipment preference

Current `completeIntake` only accepts sport, experience, age group, training days, and timeline:

```ts
export const completeIntake = mutation({
  args: {
    sportId: v.id("sports"),
    yearsOfExperience: v.number(),
    preferredTrainingDaysPerWeek: v.number(),
    selectedTrainingDays: v.optional(v.array(v.number())),
    weeksUntilSeason: v.optional(v.number()),
    ageGroup: v.union(v.literal("14-17"), v.literal("18-35"), v.literal("36+")),
    intakeType: v.optional(intakeTypeValidator),
  },
})
```

Implication: there is currently no persisted user preference for `gym` vs `home`.

### 2. Workout query returns one active exercise prescription only

Current `programTemplates.getWorkoutWithScaling` fetches the template, user program, intake, and exercise documents, then scales each prescribed exercise:

```ts
export const getWorkoutWithScaling = query({
  args: {
    templateId: v.id("program_templates"),
  },
  handler: async (ctx, args) => {
    // ... fetch user, template, intake, exercises, maxes ...

    const scaledExercises = template.exercises.map((prescription) => {
      const exercise = exerciseMap.get(prescription.exerciseId.toString())
      // ... compute scaled values ...
      return {
        ...prescription,
        exercise,
        scaledSets: params.sets,
        scaledReps: String(params.reps),
      }
    })
  },
})
```

Implication: the frontend currently receives a single resolved exercise per slot, not a pair of `gym` / `home` variants.

### 3. Workout detail screen has no equipment toggle

Current workout detail screen calls `getWorkoutWithScaling` and renders the exercise list:

```ts
const template = useQuery(
  api.programTemplates.getWorkoutWithScaling,
  id ? { templateId: id as Id<"program_templates"> } : "skip"
)

const startSession = useMutation(api.gppWorkoutSessions.startSession)
```

When the user starts the workout, we currently send:

```ts
const result = await startSession({
  templateId: template._id,
  exerciseOrder: hasCustomOrder ? orderIndices : undefined,
})
```

Implication: there is no equipment mode in local state, query data, or session creation.

### 4. Workout sessions do not snapshot environment

Current `gpp_workout_sessions` schema tracks timing, exercise completion, template snapshot, and scaling snapshot, but not equipment mode:

```ts
gpp_workout_sessions: defineTable({
  userId: v.id("users"),
  templateId: v.id("program_templates"),
  userProgramId: v.id("user_programs"),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  status: sessionStatusValidator,
  targetIntensity: v.optional(intensityValidator),
  exercises: v.array(/* ... */),
  exerciseOrder: v.optional(v.array(v.number())),
  templateSnapshot: v.optional(v.object({
    name: v.string(),
    phase: phaseValidator,
    week: v.number(),
    day: v.number(),
    workoutDate: v.number(),
  })),
  scalingSnapshot: v.optional(v.object({
    categoryId: v.number(),
    phase: phaseValidator,
    ageGroup: ageGroupValidator,
    yearsOfExperience: v.number(),
  })),
})
```

Implication: historical sessions cannot tell us whether the athlete completed the workout in `gym` or `home` mode.

### 5. Profile has an App Settings placeholder but no settings screen wired up

Current profile UI:

```ts
<Card
  onPress={() => {
    console.log('Settings pressed')
  }}
>
  <Text>App Settings</Text>
</Card>
```

Implication: there is already a natural product entry point for equipment preference, but it is not implemented yet.

### 6. Intake flow has no equipment step

Current intake layout only includes:

```ts
<Stack.Screen name="sport" />
<Stack.Screen name="age-group" />
<Stack.Screen name="experience-years" />
<Stack.Screen name="training-days" />
<Stack.Screen name="season-timeline" />
<Stack.Screen name="maxes" />
<Stack.Screen name="results" />
```

Implication: we need to insert a new route and update progress-dot indexing carefully.

## Proposed architecture

### Core idea

We will keep `program_templates.exercises[]` as the canonical source of workout structure.

For each prescribed exercise:

1. Identify the athlete's active mode: `gym` or `home`.
2. Resolve an alternative exercise in the opposite or target environment if one exists.
3. Return both variants from the backend so the workout screen can toggle instantly.
4. Start the session with the selected mode and snapshot it.

### Proposed validators

```ts
const equipmentModeValidator = v.union(
  v.literal("gym"),
  v.literal("home")
)
```

### Proposed schema changes

#### `exercises`

Add a manual override field for edge cases:

```ts
preferredAlternativeSlug: v.optional(v.string())
```

Purpose:

1. Escape hatch when tag matching picks the wrong move.
2. Lets us correct individual swaps without rewriting the matching engine.

#### `user_programs`

Persist the athlete's current preference:

```ts
equipmentMode: v.optional(equipmentModeValidator)
```

Purpose:

1. Drive default workout rendering.
2. Keep the preference global across workouts.

#### `intake_responses`

Preserve the original choice made during onboarding:

```ts
equipmentMode: v.optional(equipmentModeValidator)
```

Purpose:

1. Historical analytics.
2. Better reassessment context later.

#### `gpp_workout_sessions`

Snapshot the selected environment when a workout starts:

```ts
equipmentMode: v.optional(equipmentModeValidator)
```

Purpose:

1. Stable in-session rendering.
2. Historical reporting and future analytics.

## Matching engine design

### Signature extraction

We should treat only movement-defining tags as part of the matching signature.

Examples:

- Keep: `push`, `pull`, `squat`, `hinge`, `lunge`, `carry`, `rotation`, `horizontal`, `vertical`, `bilateral`, `unilateral`
- Ignore: `upper_body`, `lower_body`, `conditioning`, `warm_up`, `cool_down`

Reason:

The movement signature needs to identify mechanical similarity, not general category labels.

### Equipment tier rules

We should normalize exercises into an equipment tier:

```ts
type EquipmentMode = "gym" | "home"

function inferEquipmentMode(exercise: ExerciseDoc): EquipmentMode {
  const equipment = exercise.equipment ?? []

  if (
    equipment.length === 0 ||
    equipment.every((item) =>
      ["bodyweight", "resistance_band", "pull_up_bar"].includes(item)
    )
  ) {
    return "home"
  }

  return "gym"
}
```

This keeps the rule simple:

1. Bodyweight and minimal-gear movements are `home`.
2. Full-gym equipment is `gym`.

### Matching priority

Proposed order:

1. `preferredAlternativeSlug` if present and valid.
2. Highest movement-signature overlap in the target mode.
3. If no acceptable candidate is found, return `null`.

### Pseudocode

```ts
function findAlternativeExercise(
  exercise: ExerciseDoc,
  allExercises: ExerciseDoc[],
  targetMode: EquipmentMode
) {
  if (exercise.preferredAlternativeSlug) {
    const override = allExercises.find(
      (candidate) =>
        candidate.slug === exercise.preferredAlternativeSlug &&
        inferEquipmentMode(candidate) === targetMode
    )
    if (override) return override
  }

  const sourceSignature = extractMovementSignature(exercise.tags)

  const candidates = allExercises
    .filter((candidate) => candidate._id !== exercise._id)
    .filter((candidate) => inferEquipmentMode(candidate) === targetMode)
    .map((candidate) => ({
      candidate,
      score: calculateSignatureOverlap(
        sourceSignature,
        extractMovementSignature(candidate.tags)
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.candidate ?? null
}
```

### Audit script

Create `scripts/exercise-audit.ts` to:

1. Load all exercises.
2. Infer each exercise's equipment tier.
3. Group by movement signature.
4. Auto-match each exercise to its best opposite-tier alternative.
5. Flag gaps.
6. Output `docs/exercise-equipment-audit.md`.

This gives us a concrete review artifact before backend/UI work continues.

## Backend proposal

### New module

Add:

```ts
convex/exerciseMatching.ts
```

Functions:

```ts
extractMovementSignature(tags: string[]): string[]
calculateSignatureOverlap(a: string[], b: string[]): number
inferEquipmentMode(exercise: ExerciseDoc): EquipmentMode
findAlternativeExercise(exercise: ExerciseDoc, allExercises: ExerciseDoc[], targetMode: EquipmentMode): ExerciseDoc | null
```

### `userPrograms`

Add:

```ts
getEquipmentMode
setEquipmentMode
```

Behavior:

1. Default to `"gym"` when unset.
2. Persist global preference on toggle.

### `completeIntake`

Extend the mutation signature:

```ts
args: {
  // existing args...
  equipmentMode: v.optional(equipmentModeValidator),
}
```

Behavior:

1. Save `equipmentMode` on `intake_responses`.
2. Copy `equipmentMode` onto `user_programs` on initial program creation.
3. Default to `"gym"` for old paths or missing values.

### `programTemplates.getWorkoutWithScaling`

Proposed return shape for each exercise entry:

```ts
{
  ...prescription,
  activeMode: "gym" | "home",
  variants: {
    gym: ResolvedExerciseVariant | null,
    home: ResolvedExerciseVariant | null,
  },
  exercise: ResolvedExerciseVariant["exercise"],
  scaledSets: number,
  scaledReps: string,
}
```

Implementation note:

The query should resolve both variants server-side so the workout detail toggle feels instant. We should avoid a second round-trip on every toggle.

### `gppWorkoutSessions.startSession`

Extend the args:

```ts
args: {
  templateId: v.id("program_templates"),
  exerciseOrder: v.optional(v.array(v.number())),
  targetIntensity: v.optional(intensityValidator),
  skipCascade: v.optional(v.boolean()),
  equipmentMode: v.optional(equipmentModeValidator),
}
```

Behavior:

1. Use the provided mode if present.
2. Otherwise fall back to `user_programs.equipmentMode`.
3. Store the final mode on the session document.
4. Include it in any session snapshot data returned to the UI.

## Frontend proposal

### Shared component

Add:

```tsx
components/EquipmentModeToggle.tsx
```

Props:

```tsx
type EquipmentMode = "gym" | "home"

type EquipmentModeToggleProps = {
  value: EquipmentMode
  onChange: (mode: EquipmentMode) => void
  disabled?: boolean
}
```

We should reuse the existing pill-toggle design language already used elsewhere in the app.

### Intake screen

Add:

```tsx
app/(intake)/equipment.tsx
```

Placement:

1. After `training-days`.
2. Before `season-timeline`.

Why here:

That is the point in intake where the user is already describing the practical conditions of training.

Screen behavior:

1. Two cards: `Gym` and `Home`.
2. Continue button disabled until a choice is made.
3. Pass `equipmentMode` through route params to later intake screens.
4. Update `IntakeProgressDots` constants and routes.

### Settings screen

Add:

```tsx
app/(athlete)/settings.tsx
```

Behavior:

1. Load persisted `equipmentMode`.
2. Render `EquipmentModeToggle`.
3. Call `setEquipmentMode` when changed.
4. Wire profile's "App Settings" card to navigate here.

### Workout detail screen

Update:

```tsx
app/(athlete)/workout/[id].tsx
```

New local state:

```tsx
const [equipmentMode, setEquipmentMode] = useState<"gym" | "home">("gym")
```

Flow:

1. Initialize from `userPrograms.getEquipmentMode` or from the enriched workout query.
2. Render toggle below phase/intensity badges.
3. Derive visible exercise list from the chosen variant.
4. Persist changes through `setEquipmentMode`.
5. Pass `equipmentMode` into `startSession`.

Pseudocode:

```tsx
  const visibleExercises = useMemo(() => {
    return template.exercises.map((item) => {
      const variant = item.variants[equipmentMode] ?? null
      return {
        ...item,
        exercise: variant?.exercise ?? item.exercise,
        scaledSets: variant?.scaledSets ?? item.scaledSets,
        scaledReps: variant?.scaledReps ?? item.scaledReps,
        wasSwapped: Boolean(variant && variant.exercise._id !== item.exerciseId),
      }
    })
  }, [template, equipmentMode])
}, [template, equipmentMode])
```

### Exercise accordion item

Update:

```tsx
components/ExerciseAccordionItem.tsx
```

Add optional swap metadata:

```tsx
wasSwapped?: boolean
originalExerciseName?: string
```

UI behavior:

1. Show small swap indicator when the rendered exercise is an alternative.
2. Keep the card readable; this should be a subtle signal, not a large warning state.

### Workout execution screen

Update:

```tsx
app/(athlete)/workout/execute/[id].tsx
```

Behavior:

1. Read `session.equipmentMode`.
2. Show a small `Gym` or `Home` badge in the header.
3. Do not allow changes during execution.

## TDD plan

This feature is a good fit for test-first development because the matching behavior can regress quietly if we rely only on manual testing.

### PR 1 tests

Files:

1. `convex/__tests__/exerciseMatching.test.ts`
2. `convex/__tests__/equipmentAudit.test.ts`

Red phase:

1. Signature extraction ignores non-movement tags.
2. Known matches resolve correctly, such as `bench_press -> push_up`.
3. Override wins over auto-match.
4. No-candidate case returns `null`.
5. Audit script flags unmatched exercises.

Example:

```ts
it("prefers override before score-based matching", () => {
  const alternative = findAlternativeExercise(source, allExercises, "gym")
  expect(alternative?.slug).toBe("sled_push")
})
```

### PR 2 tests

Files:

1. `convex/__tests__/userPrograms.test.ts`
2. `convex/__tests__/programTemplates.test.ts`

Red phase:

1. `getEquipmentMode` defaults to `"gym"`.
2. `setEquipmentMode` persists updates.
3. `completeIntake` stores mode.
4. `getWorkoutWithScaling` returns both variants.
5. Session start snapshots the selected mode.

### PR 3 tests

Files:

1. `app/__tests__/workout-equipment-toggle.test.tsx`
2. `components/__tests__/ExerciseAccordionItem.test.tsx`

Red phase:

1. Workout detail initializes with persisted mode.
2. Exercises swap when toggled.
3. Exercises without alternatives remain unchanged.
4. `startSession` receives the selected mode.
5. Swap indicator renders only for swapped exercises.

### PR 4 tests

Files:

1. `app/__tests__/equipment-intake.test.tsx`
2. `app/__tests__/settings.test.tsx`
3. `components/__tests__/EquipmentModeToggle.test.tsx`

Red phase:

1. Intake screen requires a selection.
2. Route params carry `equipmentMode` forward.
3. Settings screen reflects persisted mode.
4. Toggle invokes callback and mutation.

## Implementation plan by PR

### PR 1: Foundation

Deliverables:

1. Schema validators and fields.
2. Missing gym-conditioning exercises added to seed data.
3. Matching helpers and audit script.
4. Generated audit doc.
5. Foundational tests.

Exit criteria:

1. Audit doc is readable and useful.
2. We have reviewed gaps and swap quality together.

### PR 2: Backend

Deliverables:

1. Matching engine module.
2. Intake persistence for equipment mode.
3. User preference queries/mutations.
4. Enriched workout query with both variants.
5. Session snapshot support.

Exit criteria:

1. Backend returns enough data for instant frontend toggling.
2. Existing workout behavior remains unchanged when mode is unset.

### PR 3: Workout UI

Deliverables:

1. Workout detail toggle.
2. Swapped exercise rendering.
3. Session start includes `equipmentMode`.
4. Execution badge.
5. Final regression test pass.

Exit criteria:

1. Toggle feels instant.
2. Workout start preserves selected mode.
3. Unmatched exercises degrade gracefully.

### PR 4: Intake + Settings

Deliverables:

1. Intake equipment screen.
2. Settings screen.
3. Shared toggle component.
4. Profile navigation wiring.
5. UI tests.

Exit criteria:

1. New users can set a preference during intake.
2. Existing users can update it later from Settings.

## Edge cases

### No alternative exists

Behavior:

1. Keep the original exercise.
2. Do not show a swap indicator.
3. Record it in the audit so we can improve coverage later.

### Supersets

Behavior:

1. Swap exercises independently within the superset.
2. Preserve superset grouping and order.

### Warmup and cooldown movements

Behavior:

1. Leave most warmups unchanged unless a very obvious equipment swap exists.
2. Do not over-engineer warmup substitution in v1.

### 1RM-driven lifts that become bodyweight movements

Behavior:

1. Use the resolved target exercise's scaling rules.
2. Do not carry `%1RM` semantics into a bodyweight alternative.

### Existing users

Behavior:

1. Default to `gym`.
2. Show the toggle in workout detail and Settings so the preference can be changed without redoing intake.

## Open implementation questions

1. Should `resistance_band` always count as `home`, or do we need a third "minimal equipment" tier later?
2. Should we exclude some power swaps from pure signature matching if the coaching intent is not close enough?
3. Do we want the workout detail toggle to persist immediately on tap, or only when the user starts the workout?

Recommendation:

1. Treat `resistance_band` as `home` in v1.
2. Use `preferredAlternativeSlug` for coaching exceptions instead of complicating the algorithm early.
3. Persist immediately on toggle so the app feels consistent across screens.

## Summary for implementation

The cleanest implementation is:

1. Add a persisted global `equipmentMode`.
2. Introduce tag-based exercise matching plus override support.
3. Return both workout variants from the backend.
4. Let the workout detail UI switch instantly.
5. Snapshot the chosen mode when the session starts.

This preserves the current template architecture, solves the product problem with minimal duplication, and gives us a review checkpoint early through the exercise audit.
