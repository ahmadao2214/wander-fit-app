# Fix: Warmup exercises not rendering in workout execution screen

## Summary

Warmup exercises appear correctly in the accordion header — the exercise count and total duration are calculated and displayed — but the phase cards inside the accordion are blank. This PR fixes the silent data gap that causes `activePhases` to be empty when `warmupPhase` is missing on exercise entries, and documents the longer-term data migration required for pre-existing templates.

---

## Root Cause

The bug lives in two places that compound each other:

### 1. `WarmupSection.tsx` — `groupByPhase` silently drops exercises

```ts
// Before (broken)
const groupByPhase = (exercises: WarmupExercise[]) => {
  return exercises.reduce((acc, ex) => {
    const phase = ex.warmupPhase   // undefined when field is missing
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(ex)
    return acc
  }, {} as Record<string, WarmupExercise[]>)
}
```

When `warmupPhase` is `undefined`, the key `"undefined"` is written into the accumulator object. `activePhases` is then derived by filtering against a known list of phase slugs (`movement_prep`, `activation`, `neural_prep`), so `"undefined"` is never matched and `activePhases` ends up empty — no cards render.

The accordion header still shows a non-zero count because it iterates the raw `exercises` array before `groupByPhase` is called.

### 2. `app/(athlete)/workout/execute/[id].tsx` — `warmupExs` extraction forwards `undefined`

```ts
// Before (broken)
const warmupExs = block.exercises.map(ex => ({
  ...ex,
  warmupPhase: ex.warmupPhase,   // passes undefined straight through
}))
```

Template documents created before the warmup PR was merged do not have `warmupPhase` on their exercise entries. The mapping faithfully forwards `undefined`, which `groupByPhase` then mishandles as described above.

---

## Changes

### `components/workout/WarmupSection.tsx`

Add a fallback phase in `groupByPhase` so exercises without an explicit `warmupPhase` are bucketed under `movement_prep` instead of silently lost:

```ts
// After (fixed)
const groupByPhase = (exercises: WarmupExercise[]) => {
  return exercises.reduce((acc, ex) => {
    const phase = ex.warmupPhase ?? 'movement_prep'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(ex)
    return acc
  }, {} as Record<string, WarmupExercise[]>)
}
```

### `app/(athlete)/workout/execute/[id].tsx`

Apply the same fallback during `warmupExs` extraction so the data passed into `WarmupSection` is always well-formed:

```ts
// After (fixed)
const warmupExs = block.exercises.map(ex => ({
  ...ex,
  warmupPhase: ex.warmupPhase ?? 'movement_prep',
}))
```

Applying the fallback at the data boundary (rather than relying solely on the component fix) keeps `WarmupSection` honest about the shape of data it receives and makes the intent explicit to future readers.

---

## Testing Notes

### Manual verification
1. Open a workout that was generated from a template created **before** the warmup PR — these templates lack `warmupPhase` on their exercise entries.
2. Navigate to the execution screen.
3. Expand the warmup accordion.
4. Confirm phase cards now render with exercises, and the card count matches the header count.
5. Open a workout from a **newer** template that already has `warmupPhase` set and verify it is unaffected.

### Unit tests
- Add a test case to `WarmupSection` tests that passes exercises with `warmupPhase: undefined` and asserts at least one phase card renders.
- Add a test case that confirms exercises without `warmupPhase` are grouped under `movement_prep`.

### Longer-term: data migration

The two code fixes above are defensive guards; they do not fix data already stored in Convex. Template documents created before the warmup PR still have `warmupPhase` absent on their exercise entries. A migration should be written following the pattern in `convex/migrations/migrateAgeGroups.ts` to backfill `warmupPhase: 'movement_prep'` on every warmup block exercise entry that is currently missing the field.

Rough shape of the migration:

```ts
// convex/migrations/migrateWarmupPhase.ts
export const migrateWarmupPhase = internalMutation({
  handler: async (ctx) => {
    const templates = await ctx.db.query('workoutTemplates').collect()
    for (const template of templates) {
      let dirty = false
      const updatedBlocks = template.blocks.map(block => {
        if (block.type !== 'warmup') return block
        const updatedExercises = block.exercises.map(ex => {
          if (ex.warmupPhase !== undefined) return ex
          dirty = true
          return { ...ex, warmupPhase: 'movement_prep' }
        })
        return { ...block, exercises: updatedExercises }
      })
      if (dirty) {
        await ctx.db.patch(template._id, { blocks: updatedBlocks })
      }
    }
  },
})
```

This migration should be run once after deploying the code fixes, then removed in a follow-up cleanup PR.
