# Add Comprehensive Exercise Warmup System

## Summary

This PR adds a structured warmup protocol with day-specific sequences designed to prepare athletes for their workouts in ~10-12 minutes.

---

## Warmup Phases

| # | Phase | Duration | Purpose |
|---|-------|----------|---------|
| 1 | **Foam Rolling** | ~2 min | Address tightness/soreness (optional - skip if feeling good) |
| 2 | **Mobility** | ~2 min | Gentle stretching and joint preparation |
| 3 | **Core Isometric** | ~1.5 min | Planks, dead bugs, side planks |
| 4 | **Core Dynamic** | ~1 min | Bird dog crunch, core bicycle |
| 5 | **Walking Drills** | ~2 min | Heel-toe walk, spiderman, knee hugs |
| 6 | **Movement Prep** | ~2 min | Jog, skip, carioca, build-up sprints |
| 7 | **Power Primer** | ~1.5 min | 3×6 med ball work or jumps at 80% effort |

---

## Day-Specific Warmups

### Lower Body Days
- **Mobility Focus**: Hip-centric exercises (90/90 rotation, world's greatest stretch, kneeling hip flexor)
- **Walking Drills**: Walking quad stretch, knee hugs, walking spiderman
- **Power Expression**: Broad jumps (3×3 at 80% effort)

### Upper Body Days
- **Mobility Focus**: Thoracic spine (windmills, thread the needle, child's pose lat stretch)
- **Walking Drills**: Inchworm, arm swings, walking lunge with rotation
- **Activation**: Band pull-aparts, scapular push-ups, prone Y-T-W
- **Power Expression**: Medicine ball chest pass (3×6 with 6lb ball)

### Power/Conditioning Days
- **Mobility Focus**: Full body (hip rotation, world's greatest stretch, thoracic windmill)
- **Locomotion**: Extended movement prep (A-skip, power skip, build-up sprints)
- **Power Expression**: Vertical jumps (3×3 at 80% effort)

---

## New Exercises Added (50+)

### Foam Rolling / Self-Myofascial Release
- Foam Roll Quads, IT Band, Glutes, Hamstrings, Calves
- Foam Roll Upper Back, Lats
- Lacrosse Ball Pec Release

### Mobility / Static Stretching
- 90/90 Hip Rotation
- Thoracic Windmill
- Kneeling Hip Flexor Stretch
- Supine Figure Four Stretch
- Child's Pose with Lat Stretch
- Thread the Needle
- Bretzel Stretch

### Core Activation - Isometric
- Isometric Dead Bug Hold
- Bent Knee Side Plank
- Tall Kneeling Pallof Hold
- Quadruped Belly Lift

### Core Activation - Dynamic
- Core Bicycle
- Bird Dog Crunch
- Glute Bridge March
- Dead Bug with Reach

### Dynamic Walking Stretches
- Heel-Toe Walk
- Walking Quad Stretch
- Walking Knee Hug
- Walking Cradle Stretch
- Walking RDL Reach
- Lateral Walk with Band
- Lateral Shuffle
- Walking Spiderman
- Inchworm
- Walking Lunge with Rotation

### Locomotion / Faster Movements
- Jog
- Carioca
- Skip
- Power Skip
- A-Skip
- B-Skip
- High Knees
- Butt Kicks
- Fast Feet
- Backpedal
- Build-Up Sprint

### Upper Body Dynamics
- Band Pull-Apart
- Band Dislocate
- Scapular Push-Up
- Wall Slide
- Arm Swing
- Prone Y-T-W Raise
- Push-Up Plus

### Power Expression (Warmup)
- Medicine Ball Chest Pass (Warmup)
- Medicine Ball Overhead Throw (Warmup)
- Medicine Ball Rotational Pass
- Box Jump (Warmup)
- Broad Jump (Warmup)
- Vertical Jump (Warmup)
- Explosive Push-Up (Warmup)

---

## UI Component: WarmupSection

### Features
- **Collapsible Header**: Shows "Warmup | ~10 min | 6 phases" with progress count
- **Phase Cards**: Each phase displayed as a numbered card with exercises
- **Progress Tracking**: Tap exercises to mark complete during workout execution
- **Completion State**: Visual indicator when warmup is complete
- **Flow Visualization**: `Mobility → Core → Walk → Move → Power`

### Example Display

**Collapsed:**
```
┌─────────────────────────────────────────────┐
│ [W] Warmup                                  │
│     ~10 min | 6 phases | 0/24 done    [▼]  │
└─────────────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────────────┐
│ [W] Warmup                                  │
│     ~10 min | 6 phases                [▲]  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [2] Mobility                            │ │
│ │  - 90/90 Hip Rotation        5 each    │ │
│ │  - World's Greatest Stretch  3 each    │ │
│ │  - Kneeling Hip Flexor       20s each  │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ [3] Core Activation                     │ │
│ │  - Isometric Dead Bug        5 each    │ │
│ │  - Plank                     20-30s    │ │
│ │  - Bent Knee Side Plank      15s each  │ │
│ └─────────────────────────────────────────┘ │
│ ... (more phases)                           │
└─────────────────────────────────────────────┘
```

---

## Files Changed

| File | Description |
|------|-------------|
| `convex/seedData.ts` | Added 50+ warmup exercises with instructions and tags |
| `convex/warmupSequences.ts` | **NEW** - Warmup phase definitions and day-specific sequences |
| `convex/generateTemplates.ts` | Updated to use comprehensive warmups with `section` field |
| `components/workout/WarmupSection.tsx` | **NEW** - UI component for warmup display |
| `convex/__tests__/warmupSequences.test.ts` | **NEW** - Unit tests for warmup logic |
| `components/workout/__tests__/WarmupSection.test.tsx` | **NEW** - Component tests |

---

## Technical Details

### Warmup Sequence Generation

```typescript
// convex/warmupSequences.ts
generateWarmupPrescriptions(
  dayType: 'lower' | 'upper' | 'power',
  includeOptional: boolean,  // Include foam rolling?
  startingOrderIndex: number
)
```

### Section Field

Exercises now include a `section` field for UI grouping:
- `"warmup"` - All warmup phases
- `"main"` - Primary workout exercises
- `"core"` - Core work
- `"cooldown"` - Cooldown stretches

---

## Test Plan

- [ ] Review warmup exercise definitions in `convex/seedData.ts`
- [ ] Verify warmup sequences for each day type (lower/upper/power)
- [ ] Check WarmupSection component displays phases correctly
- [ ] Confirm power primer exercises match day focus
- [ ] Verify total warmup duration approximates 10-12 minutes
- [ ] Test exercise completion tracking in UI
