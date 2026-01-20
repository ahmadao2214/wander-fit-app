---
name: Trial User Launch Plan
overview: Priority pivot to get the 15-year-old basketball player trial-ready within ~4 weeks. This plan covers adding the custom basketball program, required schema decisions, testing checklist, and future roadmap items (subscription, trainer UI).
todos:
  - id: schema-decision
    content: "Decide on schema approach: Option A (notes field) vs Option B (section field)"
    status: pending
  - id: add-exercises
    content: Add ~20 new exercises to seedData.ts for basketball program
    status: pending
  - id: cofounder-weeks
    content: Cofounder completes spreadsheet for Month 1 Weeks 2-4
    status: pending
  - id: seed-basketball
    content: Create seedBasketballProgram mutation and seed Week 1
    status: pending
  - id: seed-remaining
    content: Seed Weeks 2-4 as cofounder provides data
    status: pending
  - id: ui-adjustments
    content: Ensure workout detail shows sections/notes properly
    status: pending
  - id: device-testing
    content: Test on iPhone, Android, and web
    status: pending
  - id: trial-launch
    content: Onboard trial athlete and begin feedback collection
    status: pending
---

# Trial User Launch Plan

## Context

A 15-year-old aspiring pro basketball player is available for a trial. Her mom (ex-athlete) is involved and has potential school contacts in Canada. This is a high-value validation opportunity that should take priority over generic feature buildout.**Current state**: App has Week 1 GPP templates for 3 skill levels. Cofounder has started a basketball-specific program in a spreadsheet.---

## Phase 1: Schema Decision (Day 1-2)

The cofounder's basketball program has more structure than your current schema supports:**Cofounder's Format**:

```javascript
Full Dynamic Warm Up: Kettlebell Goblet Squat 65% 3x12...
CIRCUIT 3x: 40 sec. plank, 20 yard skip...
Finisher: Sled push 3x20 seconds
```

**Current Schema** ([convex/schema.ts](convex/schema.ts) lines 160-169):

- Flat `exercises` array with `orderIndex`
- No "section" concept (warm-up, main, circuit, finisher)
- No intensity percentage field

### Decision Options

**Option A: Keep Schema Simple (Recommended for Trial)**

- Use the `notes` field to indicate sections: `notes: "WARMUP"`, `notes: "CIRCUIT 3x"`, `notes: "FINISHER"`
- Parse intensity from exercise name or notes: `"Kettlebell Goblet Squat @ 65%"`
- Pro: No schema migration, faster to implement
- Con: Less structured, harder to display distinctly in UI

**Option B: Add Section Field**

- Add `section?: "warmup" | "main" | "circuit" | "finisher"` to exercise objects
- Add `intensityPercent?: number` field
- Pro: Cleaner data model
- Con: Requires schema migration, more work

**Recommendation**: Start with Option A for the trial. Gather feedback, then decide if Option B is worth the migration.---

## Phase 2: Add Basketball Exercises (Days 2-4)

Several exercises in the cofounder's program don't exist in your exercise library. Add these to [convex/seedData.ts](convex/seedData.ts):

### New Exercises Needed

From the spreadsheet:

- `lateral_lean` - Lower body mobility
- `skater_hops` - Plyometric
- `sled_push` - Conditioning (equipment: sled)
- `sled_pull` - Conditioning
- `med_ball_chest_pass` - Upper body power
- `med_ball_overhead_pass` - Full body power
- `ez_curl_skullcrusher` - Upper body isolation
- `cable_lat_pulldown` - Upper body pull (already have `lat_pulldown`)
- `db_lateral_raise` - Shoulder isolation
- `pike_pushup` - Upper body push (bodyweight)
- `reverse_plank` - Core
- `trx_row` / `bar_row` - Pull (equipment: trx, bar)
- `elbow_side_plank` - Core (variant of `side_plank`)
- `jumping_jacks` - Warmup/conditioning
- `mountain_climbers` - Core/conditioning
- `ab_bicycle` - Core
- `lateral_skip` - Warmup/agility
- `sprint` - Conditioning (time/distance based)
- `tank_push` / `tank_pull` - Conditioning (equipment: tank)

### Basketball-Specific Exercises

- `aggressive_dribble` - Sport-specific skill (tags: basketball, conditioning)

---

## Phase 3: Seed Basketball Program (Days 4-10)

Create a new seed function in [convex/seed.ts](convex/seed.ts) for the basketball program.

### Structure

```typescript
// convex/seed.ts
export const seedBasketballProgram = mutation({
  args: {},
  handler: async (ctx) => {
    // Basketball is Category 2 (Explosive/Vertical)
    const gppCategoryId = 2;
    
    // Create Month 1, Weeks 1-4, Days 1-3
    // Use "notes" field for section labels
  }
});
```

### Month 1 Program (from spreadsheet)

- Week 1: Day 1 (Lower Push), Day 2 (Upper Push/Pull), Day 3 (Lower Hinge)
- Weeks 2-4: TBD (cofounder to complete)

**Action**: Cofounder needs to complete Weeks 2-4 before you can seed the full program.---

## Phase 4: UI Adjustments (Days 10-14)

Ensure the app displays the basketball program properly:

### Required

- Workout card shows exercises with notes (section indicators)
- Logging flow works for time-based exercises ("40 sec", "20 yards")
- History shows completed basketball workouts

### Nice-to-Have

- Visual section grouping in workout detail view
- Circuit timer (if circuits are common)

---

## Phase 5: Device Testing (Days 14-20)

### Test Checklist

- Athlete can complete intake and get assigned to basketball program (Category 2)
- Today tab shows correct scheduled workout
- Athlete can start workout and log exercises
- Athlete can reorder exercises during workout
- History shows completed workouts with logged data
- Program tab shows all 4 weeks (once seeded)
- Drag-to-reorder works on mobile

### Platforms

- iPhone (Expo Go or TestFlight) - High priority
- Android (Expo Go) - Medium priority
- Web (localhost / deploy) - Medium priority

---

## Phase 6: Trial Launch (Day 21+)

### Onboarding the Athlete

1. Create her account (or send invite link)
2. Have her complete intake flow (select Basketball, answer assessment questions)
3. She gets assigned to GPP Category 2, appropriate skill level
4. She starts training

### Feedback Collection

- Shared Google Doc or Notion page
- Weekly 15-min check-in call
- Focus on: What's confusing? What's missing? What do you love?

---

## Deferred Items (Post-Trial)

### Subscription Model (Draft Notes)

- **Free**: Base admin programs (GPP only?), limited history - $0
- **Athlete**: All phases, customization, full history - $9-15/mo
- **Trainer**: Create programs for athletes, manage clients - $29-49/mo
- **Team**: Multiple trainers, bulk athlete management - Custom

### Trainer Content Creation UI

- Trainers can create `program_templates` via UI (not just seed)
- Exercise library search + add
- Same DB schema, different entry method

### Intake Reassessment Flow

- After completing a training block, athlete can retake assessment
- If they "pass" harder exercises, they level up (Novice → Moderate)

### Generic GPP Weeks 2-4

- Can be deprioritized since basketball program takes precedence

---