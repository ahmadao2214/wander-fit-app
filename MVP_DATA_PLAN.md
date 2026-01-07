# MVP Data Plan: Exercise Templates & Age Groups

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Age Groups | Intensity Modifier (Option 1) | Avoids template explosion (432 vs 1,296), age affects prescription at runtime |
| Phase Mapping | Spreadsheet phases map to GPP → SPP → SSP | Baseline=GPP, Progression=SPP, Advanced=SSP |
| MVP Scope | Start with Category 1, generate all 432 | Soccer data exists, generate others programmatically |
| Template Generation | Script with reasonable defaults | Strength coach reviews/adjusts |

## Future Consideration (Out of Scope)

Trainer exercise management component - ability to reorganize, add/remove exercises for individual athletes. This doesn't change the need for baseline seed data.

---

## Implementation Plan

### Phase 1: Schema Changes for Age Groups

**File:** `convex/schema.ts`

Add age group validators and fields:

```typescript
// New validator
const ageGroupValidator = v.union(
  v.literal("10-13"),
  v.literal("14-17"),
  v.literal("18+")
);

// Add to intake_responses table:
ageGroup: ageGroupValidator,
dateOfBirth: v.optional(v.number()), // For auto-calculation

// Add to user_programs table:
ageGroup: ageGroupValidator,
```

**File:** `convex/intensityScaling.ts`

Add age-based intensity rules:

```typescript
export const AGE_INTENSITY_RULES = {
  "10-13": {
    maxIntensity: "Moderate" as const,
    oneRepMaxCeiling: 0.65,
    plyometricAllowed: true, // All plyometrics allowed
    maxSetsPerExercise: 3,
    maxRepsMultiplier: 1.2, // Higher reps, lower weight
  },
  "14-17": {
    maxIntensity: "High" as const,
    oneRepMaxCeiling: 0.85,
    plyometricAllowed: true,
    maxSetsPerExercise: 5,
    maxRepsMultiplier: 1.0,
  },
  "18+": {
    maxIntensity: "High" as const,
    oneRepMaxCeiling: 0.90, // Cap at 90%, can push to 95% for peaking
    plyometricAllowed: true,
    maxSetsPerExercise: 6,
    maxRepsMultiplier: 1.0,
  },
};

// Phase-specific 1RM ranges
export const PHASE_INTENSITY_RANGES = {
  GPP: { min: 0.60, max: 0.75 },  // 60-75% 1RM
  SPP: { min: 0.75, max: 0.85 },  // 75-85% 1RM
  SSP: { min: 0.85, max: 0.90 },  // 85-90% 1RM
};
```

---

### Phase 2: Add Missing Exercises

**File:** `convex/seedData.ts`

Add these exercises from the spreadsheet:

| Exercise | Slug | Tags | Equipment | Difficulty |
|----------|------|------|-----------|------------|
| Glute Bridge | `glute_bridge` | lower_body, hinge, bilateral, glute | bodyweight | beginner |
| Medicine Ball Chest Pass | `med_ball_chest_pass` | upper_body, push, power, explosive | medicine_ball | beginner |
| Bicycle Crunch | `bicycle_crunch` | core, rotation, conditioning | bodyweight | beginner |
| Hamstring Curl | `hamstring_curl` | lower_body, isolation, hamstring | cable_machine | beginner |
| Sled Push | `sled_push` | full_body, conditioning, power | sled | intermediate |
| Sled Pull | `sled_pull` | full_body, conditioning, back | sled | intermediate |
| Single Arm Plank | `single_arm_plank` | core, anti_rotation, stability | bodyweight | intermediate |
| Shuttle Sprint | `shuttle_sprint` | conditioning, power, agility | bodyweight | beginner |
| Stability Ball Plank | `stability_ball_plank` | core, anti_extension, stability | stability_ball | intermediate |
| Band Woodchop | `band_woodchop` | core, rotation, functional | band | beginner |
| Plyometric Push-Up | `plyo_push_up` | upper_body, push, plyometric, power | bodyweight | intermediate |

Also add equipment:
- `sled`
- `stability_ball`

---

### Phase 3: Template Generation Script

**File:** `convex/generateTemplates.ts`

Create a script that generates all 432 templates with the following logic:

#### Template Matrix
```
4 Categories × 3 Phases × 3 Skill Levels × 4 Weeks × 3 Days = 432 templates
```

#### Workout Structure by Day
| Day | Focus | Primary Movements |
|-----|-------|-------------------|
| 1 | Lower Body | Squat, Hinge, Lunge, Core |
| 2 | Upper Body | Push (H+V), Pull (H+V), Core |
| 3 | Power/Conditioning | Plyometrics, Carries, Conditioning |

#### Phase Characteristics (from spreadsheet mapping)

**GPP (Baseline) - Weeks 1-4:**
- Foundation movements
- Higher reps (10-15), moderate weight (60-75% 1RM)
- Focus on form and movement quality
- Tempo: 3010 (controlled)

**SPP (Progression) - Weeks 5-8:**
- Sport-specific progressions
- Moderate reps (8-12), higher weight (75-85% 1RM)
- Add single-arm/single-leg variants
- Tempo: 2010 (faster concentric)

**SSP (Advanced) - Weeks 9-12:**
- Explosive/plyometric emphasis
- Lower reps (5-8), peak weight (85-90% 1RM)
- Complex movements, reactive drills
- Tempo: X010 (explosive)

#### Week Progression Within Each Phase
| Week | Volume | Intensity | Notes |
|------|--------|-----------|-------|
| 1 | 70% | 70% | Introduction |
| 2 | 85% | 80% | Build |
| 3 | 100% | 90% | Peak |
| 4 | 60% | 70% | Deload |

#### Skill Level Adjustments
| Level | Sets | Reps | Rest | Complexity |
|-------|------|------|------|------------|
| Novice | 2-3 | 12-15 | 60-90s | Basic bilateral |
| Moderate | 3-4 | 8-12 | 60-75s | Add unilateral |
| Advanced | 4-5 | 5-8 | 45-60s | Complex + explosive |

#### Category-Specific Exercise Selection

**Category 1: Continuous/Directional (Soccer, etc.)**
- Emphasis: Single-leg stability, rotational core, conditioning
- Key exercises: Single-leg RDL, Lateral Lunge, Pallof Press, Shuttle Sprints

**Category 2: Explosive/Vertical (Basketball, etc.)**
- Emphasis: Vertical power, landing mechanics, reactive strength
- Key exercises: Box Jump, Depth Jump, Trap Bar Deadlift, Hip Thrust

**Category 3: Rotational/Unilateral (Baseball, etc.)**
- Emphasis: Anti-rotation, thoracic mobility, hip power
- Key exercises: Cable Woodchop, Med Ball Rotational Throw, Single-Arm Row

**Category 4: General Strength (Football, etc.)**
- Emphasis: Bilateral strength, work capacity, grip
- Key exercises: Back Squat, Bench Press, Deadlift, Farmer Carry

---

### Phase 4: Seed Function

**File:** `convex/seed.ts`

Add function to seed all generated templates:

```typescript
export const seedAllTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate and insert all 432 templates
    // Returns: { created: number, skipped: number }
  },
});
```

---

## Template Data Structure

Each template follows this structure:

```typescript
{
  // Coordinates
  gppCategoryId: 1-4,
  phase: "GPP" | "SPP" | "SSP",
  skillLevel: "Novice" | "Moderate" | "Advanced",
  week: 1-4,
  day: 1-3,

  // Metadata
  name: "Lower Body Foundation - Week 1",
  description: "Focus on squat and hinge patterns with controlled tempo.",
  estimatedDurationMinutes: 45,

  // Exercises (7-10 per workout)
  exercises: [
    // Warmup (2-3 exercises)
    { exerciseId, sets: 1, reps: "10", restSeconds: 0, notes: "Warmup", orderIndex: 0 },

    // Main Work (4-6 exercises)
    { exerciseId, sets: 3, reps: "12-15", tempo: "3010", restSeconds: 60, orderIndex: 1 },

    // Cooldown (1-2 exercises)
    { exerciseId, sets: 1, reps: "30s each", restSeconds: 0, notes: "Cooldown", orderIndex: 6 },
  ]
}
```

---

## Intensity Scaling with Age Groups

When a workout is executed, the system applies age-based modifiers:

```typescript
function applyAgeModifiers(prescription, ageGroup, phase) {
  const ageRules = AGE_INTENSITY_RULES[ageGroup];
  const phaseRanges = PHASE_INTENSITY_RANGES[phase];

  // Calculate effective 1RM ceiling (age ceiling capped by phase range)
  const effectiveCeiling = Math.min(ageRules.oneRepMaxCeiling, phaseRanges.max);

  return {
    ...prescription,
    // Cap intensity
    intensity: Math.min(prescription.intensity, ageRules.maxIntensity),
    // Adjust weight ceiling based on age AND phase
    targetWeight: prescription.targetWeight * effectiveCeiling,
    oneRepMaxRange: {
      min: phaseRanges.min,
      max: effectiveCeiling,
    },
    // Cap sets
    sets: Math.min(prescription.sets, ageRules.maxSetsPerExercise),
    // All plyometrics allowed for all age groups
  };
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `convex/schema.ts` | Modify | Add ageGroup to intake_responses and user_programs |
| `convex/seedData.ts` | Modify | Add 11 new exercises, 2 new equipment types |
| `convex/intensityScaling.ts` | Modify | Add AGE_INTENSITY_RULES |
| `convex/generateTemplates.ts` | Create | Template generation logic |
| `convex/seed.ts` | Modify | Add seedAllTemplates function |
| `types/index.ts` | Modify | Add AgeGroup type |

---

## Execution Order

1. **Schema changes** (age groups) - Required first for intake flow
2. **Add exercises** to seedData.ts - Required before template generation
3. **Create template generator** - The main work
4. **Run seed functions** - Populate database
5. **Strength coach review** - Manual adjustments via Convex dashboard or future admin UI

---

## Success Criteria

- [ ] 432 templates generated and seeded
- [ ] All 29 sports can complete intake
- [x] Age group captured in intake and applied to intensity (schema updated)
- [ ] Athletes can execute full 12-week program (GPP → SPP → SSP)
- [ ] Strength coach can review/modify templates

---

## Implementation Status

### Completed Changes

| File | Change | Status |
|------|--------|--------|
| `convex/schema.ts` | Added `ageGroupValidator`, added `ageGroup` to `intake_responses` and `user_programs` | ✅ Done |
| `convex/seedData.ts` | Added 11 new exercises, 2 new equipment types (sled, stability_ball) | ✅ Done |
| `convex/intensityScaling.ts` | Added `AGE_INTENSITY_RULES`, `PHASE_INTENSITY_RANGES`, helper functions | ✅ Done |
| `types/index.ts` | Added `AgeGroup` type, updated interfaces | ✅ Done |
| `convex/generateTemplates.ts` | Created template generator with all 432 templates | ✅ Done |

### New Exercises Added (11)

1. `glute_bridge` - Lower body, beginner
2. `med_ball_chest_pass` - Upper body power, beginner
3. `bicycle_crunch` - Core, beginner
4. `hamstring_curl` - Lower body isolation, beginner
5. `sled_push` - Conditioning, intermediate
6. `sled_pull` - Conditioning, intermediate
7. `single_arm_plank` - Core stability, intermediate
8. `shuttle_sprint` - Conditioning, beginner
9. `stability_ball_plank` - Core stability, intermediate
10. `band_woodchop` - Core rotation, beginner
11. `plyo_push_up` - Upper body power, intermediate

### How to Generate Templates

Run these commands in the Convex dashboard:

```javascript
// 1. First, seed exercises (if not already done)
seed.seedAll({})

// 2. Preview a template before bulk generation
generateTemplates.previewTemplate({
  categoryId: 1,
  phase: "GPP",
  skillLevel: "Novice",
  week: 1,
  day: 1
})

// 3. Check current status
generateTemplates.getGenerationStatus({})

// 4. Generate all 432 templates (dry run first)
generateTemplates.generateAllTemplates({ dryRun: true })

// 5. Generate all templates for real
generateTemplates.generateAllTemplates({})

// OR generate one category at a time:
generateTemplates.generateCategoryTemplates({ categoryId: 1 })
generateTemplates.generateCategoryTemplates({ categoryId: 2 })
generateTemplates.generateCategoryTemplates({ categoryId: 3 })
generateTemplates.generateCategoryTemplates({ categoryId: 4 })
```

---

## Questions for Strength Coach (RESOLVED)

| Question | Answer |
|----------|--------|
| Exercise selection per category | Correct (from spreadsheet) |
| 1RM ranges by phase | GPP: 60-75%, SPP: 75-85%, SSP: 85-90% |
| 18+ 1RM ceiling | 90% (can push to 95% for peaking) |
| Plyometrics for 10-13 | ALL allowed |
| Rest periods by skill level | Confirmed appropriate |
| Tempo notation | 3010/2010/X010 format confirmed |

---

## Estimated Effort

| Task | Effort | Dependencies |
|------|--------|--------------|
| Schema changes | 1-2 hours | None |
| Add exercises | 1-2 hours | None |
| Template generator | 4-6 hours | Exercises seeded |
| Seed all templates | 1 hour | Generator complete |
| Strength coach review | Variable | Templates seeded |

**Total development time:** ~8-12 hours

---

## Next Steps

1. Approve this plan
2. I'll implement schema changes for age groups
3. Add missing exercises to seedData.ts
4. Create the template generation script
5. Generate and seed all 432 templates
6. Export for strength coach review
