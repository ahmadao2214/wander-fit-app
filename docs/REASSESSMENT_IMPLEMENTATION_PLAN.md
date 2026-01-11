# Intake Reassessment Flow - Implementation Plan

## Overview

This document outlines the implementation plan for the intake reassessment feature. Reassessment is **required** before unlocking the next training phase, and collects both **maxes updates** and **skill level evaluation**.

---

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Mandatory vs Optional | **Required** - Must complete before unlocking next phase |
| Data to Collect | **Both** - Maxes re-testing AND skill level assessment |
| Celebration | **Yes** - Show celebration when phase completes |
| Phase Transitions | **All three** - GPP→SPP, SPP→SSP, SSP→New Cycle |
| Manual Trigger | **Yes** - Available from Settings in Profile |
| Minimum Completion | **No minimum** - Users can proceed even with low completion rate |
| SSP Phase Access | **Full access** - Athletes on SSP have access to ALL phases |

---

## Phase Transitions

### Transition 1: GPP → SPP
- **Trigger**: Complete Week 4 of GPP (all training days)
- **Unlock**: SPP phase becomes available
- **Reassessment Focus**: Foundation skills, core lift improvements

### Transition 2: SPP → SSP
- **Trigger**: Complete Week 4 of SPP
- **Unlock**: SSP phase becomes available
- **Reassessment Focus**: Sport-specific readiness, power development

### Transition 3: SSP → New Cycle
- **Trigger**: Complete Week 4 of SSP (full 12-week program)
- **Unlock**: Start new 12-week cycle at GPP with potential skill upgrade
- **Reassessment Focus**: Full program review, major skill level evaluation

---

## Database Schema Changes

### `user_programs` Table Additions

```typescript
// Add to user_programs table in schema.ts

// Reassessment tracking - blocks phase progression until complete
reassessmentPendingForPhase: v.optional(phaseValidator), // "GPP" | "SPP" | "SSP" - which phase triggered reassessment

// Reassessment completion timestamps (for history/analytics)
gppReassessmentCompletedAt: v.optional(v.number()),
sppReassessmentCompletedAt: v.optional(v.number()),
sspReassessmentCompletedAt: v.optional(v.number()),
```

### `intake_responses` Table Additions

```typescript
// Add to intake_responses table for reassessment-specific data

// Self-assessment data (collected during reassessment)
selfAssessment: v.optional(v.object({
  phaseDifficulty: v.union(
    v.literal("too_easy"),
    v.literal("just_right"),
    v.literal("challenging"),
    v.literal("too_hard")
  ),
  completionRate: v.optional(v.number()), // 0-100% of workouts completed
  energyLevel: v.optional(v.union(
    v.literal("low"),
    v.literal("moderate"),
    v.literal("high")
  )),
  notes: v.optional(v.string()),
})),

// Previous skill level (to track progression)
previousSkillLevel: v.optional(skillLevelValidator),

// Maxes change summary
maxesUpdated: v.optional(v.boolean()),
```

---

## User Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    NORMAL WORKOUT FLOW                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Complete workout on Week 4, Day N (last day of phase)          │
│  advanceToNextDay() detects phase transition                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SET: reassessmentPendingForPhase = currentPhase                │
│  RETURN: { reassessmentRequired: true, completedPhase: "GPP" }  │
│  (Do NOT advance phase yet)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               CELEBRATION SCREEN                                │
│  "Congratulations! You've completed GPP!"                       │
│  [Animation + Stats Summary]                                    │
│  [Continue to Check-In →]                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            REASSESSMENT FLOW (3 Screens)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCREEN 1: Self-Assessment                                      │
│  ─────────────────────────                                      │
│  "How did GPP feel?"                                            │
│  [ ] Too Easy - Ready for more challenge                        │
│  [ ] Just Right - Good progression                              │
│  [ ] Challenging - Pushed my limits                             │
│  [ ] Too Hard - Need more time at this level                    │
│                                                                 │
│  "How's your energy?"                                           │
│  [ Low ] [ Moderate ] [ High ]                                  │
│                                                                 │
│  [Continue →]                                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCREEN 2: Maxes Re-Test                                        │
│  ────────────────────────                                       │
│  "Let's update your lifts"                                      │
│                                                                 │
│  Back Squat       [225] lbs  (was: 205 lbs) ↑                  │
│  Bench Press      [185] lbs  (was: 175 lbs) ↑                  │
│  Trap Bar Deadlift [275] lbs (was: 275 lbs) =                  │
│                                                                 │
│  [ Skip for now ]  [ Update Maxes → ]                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCREEN 3: Results & Confirmation                               │
│  ────────────────────────────────                               │
│  "Here's what changed"                                          │
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │ SKILL LEVEL UPGRADE!                 │                      │
│  │ Novice → Moderate                    │                      │
│  │ Based on: completion rate, feedback  │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │ STRENGTH GAINS                       │                      │
│  │ +20 lbs Back Squat                   │                      │
│  │ +10 lbs Bench Press                  │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  "Ready for SPP - Sport-Specific Training"                     │
│                                                                 │
│  [ Start SPP → ]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  completeReassessment() mutation:                               │
│  - Create intake_responses record (intakeType: "reassessment")  │
│  - Update user_programs.skillLevel if upgraded                  │
│  - Clear reassessmentPendingForPhase                            │
│  - Set [phase]ReassessmentCompletedAt timestamp                 │
│  - Advance to next phase (GPP→SPP, SPP→SSP, or SSP→GPP cycle)   │
│  - Unlock the new phase                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUE TO NEW PHASE                        │
│  Redirect to dashboard with new phase active                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skill Level Upgrade Criteria

### Automatic Upgrade Triggers

| From | To | Criteria |
|------|-----|----------|
| Novice | Moderate | Self-assessment: "Too Easy" or "Just Right" + Completed 75%+ workouts |
| Moderate | Advanced | Self-assessment: "Too Easy" or "Just Right" + Completed 80%+ workouts + 2+ phases completed |

### Factors Considered

1. **Self-Assessment Response**
   - "Too Easy" → Strong signal for upgrade
   - "Just Right" → Possible upgrade if other factors align
   - "Challenging" → Stay at current level
   - "Too Hard" → Consider downgrade (with confirmation)

2. **Completion Rate** (from workout sessions)
   - Calculate: completed sessions / expected sessions for the phase
   - Threshold: 75% for Novice→Moderate, 80% for Moderate→Advanced

3. **Maxes Improvement**
   - If core lifts improved 10%+, additional signal for upgrade
   - Not required, but contributes to decision

4. **Energy Level**
   - "High" energy → Ready for more challenge
   - "Low" energy → May need recovery, stay at level

### No Automatic Downgrades
- If user says "Too Hard", show a message but keep current level
- Offer option to manually adjust in settings if they really want to

---

## Navigation Structure

### New Routes

```
app/
├── (reassessment)/
│   ├── _layout.tsx          # Stack navigator for reassessment flow
│   ├── celebration.tsx      # Phase completion celebration
│   ├── self-assessment.tsx  # How did the phase feel?
│   ├── maxes.tsx            # Re-test 1RM values
│   └── results.tsx          # Summary + confirm to continue
```

### Route Parameters

```typescript
// Passed through the reassessment flow
type ReassessmentParams = {
  completedPhase: "GPP" | "SPP" | "SSP";
  nextPhase: "SPP" | "SSP" | "GPP"; // GPP if completing full cycle
  isFullCycleComplete: boolean;
}
```

---

## API Changes

### Modified Mutations

#### `advanceToNextDay` (userPrograms.ts)

```typescript
// Current behavior: Advances phase immediately
// New behavior: Set pending reassessment flag, return signal to UI

if (currentWeek > 4) {
  // Instead of advancing immediately...
  await ctx.db.patch(args.programId, {
    reassessmentPendingForPhase: currentPhase,
    updatedAt: now,
  });

  return {
    advanced: false, // Changed from true
    reassessmentRequired: true, // New field
    completedPhase: currentPhase,
    nextPhase: phaseOrder[currentPhaseIndex + 1] ?? "GPP",
    isFullCycleComplete: currentPhaseIndex >= phaseOrder.length - 1,
  };
}
```

### New Mutations

#### `completeReassessment` (userPrograms.ts)

```typescript
export const completeReassessment = mutation({
  args: {
    // Self-assessment data
    phaseDifficulty: v.union(
      v.literal("too_easy"),
      v.literal("just_right"),
      v.literal("challenging"),
      v.literal("too_hard")
    ),
    energyLevel: v.optional(v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high")
    )),
    notes: v.optional(v.string()),

    // Maxes were updated separately via existing mutation
    maxesUpdated: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 1. Validate user has pending reassessment
    // 2. Calculate completion rate from sessions
    // 3. Determine if skill level upgrade is warranted
    // 4. Create intake_responses record
    // 5. Update user_programs:
    //    - skillLevel (if upgraded)
    //    - Clear reassessmentPendingForPhase
    //    - Set [phase]ReassessmentCompletedAt
    //    - Advance to next phase
    //    - Set phase unlock timestamp
    // 6. Return results for UI
  },
});
```

#### `getReassessmentStatus` (userPrograms.ts)

```typescript
export const getReassessmentStatus = query({
  args: {},
  handler: async (ctx) => {
    // Returns:
    // - reassessmentPending: boolean
    // - pendingForPhase: "GPP" | "SPP" | "SSP" | null
    // - completionStats: { completed: number, expected: number, rate: number }
    // - currentMaxes: { exercise, current, previous }[]
    // - canUpgradeSkillLevel: boolean
  },
});
```

#### `triggerManualReassessment` (userPrograms.ts)

```typescript
export const triggerManualReassessment = mutation({
  args: {},
  handler: async (ctx) => {
    // Sets reassessmentPendingForPhase to current phase
    // Allows user to re-take assessment from settings
    // Does NOT reset phase progress
  },
});
```

---

## Settings Integration

### Profile Page Updates

Add to the existing Settings section in `app/(athlete)/profile.tsx`:

```tsx
{/* Reassessment Option */}
<Card
  p="$4"
  bg="$surface"
  rounded="$4"
  borderWidth={1}
  borderColor="$borderColor"
  pressStyle={{ bg: '$surfaceHover' }}
  onPress={() => router.push('/(reassessment)/self-assessment?manual=true')}
>
  <XStack items="center" gap="$3">
    <YStack bg="$brand2" p="$2" rounded="$10">
      <RefreshCw size={18} color="$primary" />
    </YStack>
    <YStack flex={1}>
      <Text fontSize={15} fontFamily="$body" fontWeight="500" color="$color12">
        Retake Assessment
      </Text>
      <Text fontSize={12} fontFamily="$body" color="$color10">
        Update your skill level and training preferences
      </Text>
    </YStack>
    <ChevronRight size={20} color="$color9" />
  </XStack>
</Card>
```

---

## Implementation Phases

### Phase 1: Database & API (Backend)
1. Update `schema.ts` with new fields
2. Modify `advanceToNextDay` to set pending reassessment
3. Add `completeReassessment` mutation
4. Add `getReassessmentStatus` query
5. Add `triggerManualReassessment` mutation

### Phase 2: Celebration Screen
1. Create `(reassessment)/_layout.tsx` stack navigator
2. Create `celebration.tsx` with animation and stats
3. Hook into workout completion flow

### Phase 3: Reassessment Flow Screens
1. Create `self-assessment.tsx` with difficulty/energy inputs
2. Create `maxes.tsx` with 1RM update UI (reuse OneRepMaxSheet logic)
3. Create `results.tsx` with summary and skill upgrade display

### Phase 4: Integration & Polish
1. Add manual trigger to Profile settings
2. Handle edge cases (app killed mid-flow, etc.)
3. Add analytics tracking
4. Test all phase transitions

### Phase 5: Full Cycle Handling
1. Implement SSP→GPP new cycle logic
2. Consider if user wants to change sport
3. Reset phase unlocks for new cycle

---

## Edge Cases

### User Closes App During Reassessment
- `reassessmentPendingForPhase` persists in database
- On next app open, check for pending reassessment
- Redirect to reassessment flow automatically

### User Tries to Start Workout with Pending Reassessment
- Block workout start
- Show message: "Complete your check-in first"
- Redirect to reassessment flow

### User at Advanced Level Completes SSP
- No skill upgrade possible (already max)
- Still collect self-assessment and maxes
- Start new 12-week cycle at Advanced GPP

### User Says Phase Was "Too Hard"
- Do NOT downgrade automatically
- Show supportive message
- Offer option to stay at current level or manually adjust
- Log feedback for future improvements

---

## Files to Create/Modify

### New Files
- `app/(reassessment)/_layout.tsx`
- `app/(reassessment)/celebration.tsx`
- `app/(reassessment)/self-assessment.tsx`
- `app/(reassessment)/maxes.tsx`
- `app/(reassessment)/results.tsx`
- `components/ReassessmentGuard.tsx` (checks for pending reassessment)
- `hooks/useReassessment.ts` (shared state/logic)

### Modified Files
- `convex/schema.ts` - Add new fields
- `convex/userPrograms.ts` - Modify advanceToNextDay, add new mutations
- `app/(athlete)/profile.tsx` - Add manual reassessment trigger
- `app/(athlete)/index.tsx` - Check for pending reassessment on load
- `components/AuthGuard.tsx` - Add reassessment pending check

---

## Success Metrics

1. **Completion Rate**: % of users who complete reassessment vs. abandon
2. **Skill Upgrades**: % of users who upgrade after each phase
3. **Maxes Updates**: % of users who update at least one max
4. **Time to Complete**: Average time spent in reassessment flow
5. **Manual Triggers**: How often users use manual reassessment from settings

---

## Resolved Questions

| Question | Decision |
|----------|----------|
| SSP Completion | Athletes on SSP have full access to all phases; can start new cycle |
| Partial Completion | Allowed - no minimum completion threshold required |

---

## Sport Change During Reassessment - Risk Analysis

### Context
Should users be able to change their sport during reassessment, or only through full program reset?

### Option A: Allow Sport Change During Reassessment

**Pros:**
- Better UX for athletes who genuinely switched sports
- Natural checkpoint to make the change
- Avoids users needing to "delete and restart"

**Cons/Risks:**
1. **Data Inconsistency**
   - Workout history tied to old GPP Category templates
   - Analytics become harder to interpret (mixing categories)
   - Progress comparisons don't make sense across different sports

2. **Programming Mismatch**
   - Sport determines GPP Category (1-4), which determines workout templates
   - E.g., Basketball (Cat 2: Lateral Power) → Soccer (Cat 1: Linear Speed)
   - Different movement patterns, exercise selection, periodization focus

3. **Phase Progress Question**
   - If they're at SPP Week 2 and change sport, do they:
     - Stay at SPP Week 2 with new sport templates? (confusing)
     - Reset to GPP Week 1? (loses progress)
     - Keep completed phases but switch templates? (inconsistent)

4. **Maxes Relevance**
   - Core lifts (squat, bench, deadlift) stay relevant
   - But sport-specific accessories differ between categories

5. **Implementation Complexity**
   - More edge cases to handle
   - Need clear UX to explain consequences
   - More testing required

### Option B: Sport Change Only Via Full Program Reset

**Pros:**
- Clean slate - no data inconsistency
- Simpler implementation
- Clear mental model for users

**Cons:**
- Loses all workout history and progress
- Frustrating for users who just want to switch
- May discourage legitimate sport changes

### Option C: Sport Change Only After Full Cycle (SSP Complete)

**Pros:**
- Natural reset point (starting new 12-week cycle anyway)
- Preserves completed cycle history
- Makes sense conceptually ("finished one sport's program, starting another")

**Cons:**
- Users stuck if they switch sports mid-program
- Have to wait potentially 8+ weeks

### Recommendation: Option B or C

**For MVP**: Go with **Option B** (full reset only)
- Keep reassessment focused on skill level and maxes
- Sport change available in Settings → "Reset Program"
- Clear messaging: "Changing sport will reset your program"

**Future Enhancement**: Consider Option C
- After SSP completion, offer sport change as part of "new cycle" flow
- "Start a new training cycle for a different sport?"

### Implementation Note

If we go with Option B, add to Settings:
```
Reset Program
├── Keep same sport (restart at GPP Week 1)
└── Change sport (triggers full intake)
```

---

## Open Questions

1. **Downgrade Path**: If user consistently says phases are "too hard", should we offer a downgrade after 2+ assessments?

2. **Sport Change**: See analysis above - **recommend Option B (full reset only) for now**

---

## Next Steps

1. Confirm sport change decision (recommend: full reset only for MVP)
2. Start with Phase 1 (Database & API)
3. Iterate on screens with design input
4. Test all phase transitions thoroughly
