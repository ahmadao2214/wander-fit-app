# Streak Milestones Celebrations Plan

> Rewarding consistency at key moments

## Overview

**Goal:** When athletes hit streak milestones (7 days, 30 days, etc.), create a special celebration moment that feels earned and memorable.

**Current State:** Streaks exist in database but aren't calculated. No milestone celebrations exist.

**Dependency:** Requires streak calculation to be working first (see immediate to-do in PRODUCT_ROADMAP.md).

---

## Milestone Definitions

| Days | Name | Tier | Rewards |
|------|------|------|---------|
| 3 | "Warming Up" | Bronze | Badge, small celebration |
| 7 | "Week Warrior" | Bronze | Badge, gear unlock |
| 14 | "Two Week Titan" | Silver | Badge, gear unlock |
| 30 | "Monthly Monster" | Silver | Badge, premium gear, parent notification |
| 50 | "Fifty Fire" | Gold | Badge, rare gear |
| 100 | "Century Club" | Gold | Badge, legendary gear, special status |
| 200 | "Double Century" | Platinum | Badge, exclusive gear |
| 365 | "Year of the Beast" | Legendary | Badge, ultimate achievement |

---

## Celebration Experience

### Standard Workout Complete vs Milestone

**Standard Complete:**
```
Confetti → Checkmark → Stats → Quote → Done
```

**Milestone Reached:**
```
Confetti → Checkmark → Stats → MILESTONE OVERLAY → Badge Reveal → Quote → Done
```

### Milestone Overlay Design

```
┌─────────────────────────────────────────────┐
│                                             │
│        ✨ ✨ ✨ EXTRA CONFETTI ✨ ✨ ✨        │
│                                             │
│              🏆 MILESTONE! 🏆               │
│                                             │
│         ═══════════════════════             │
│                                             │
│              "WEEK WARRIOR"                 │
│               7-Day Streak                  │
│                                             │
│         ═══════════════════════             │
│                                             │
│           [ Badge Animation ]               │
│              🔥 unlocking 🔥                │
│                                             │
│         ─────────────────────               │
│         "You've trained for 7 days          │
│          straight. That's dedication        │
│          most people never show."           │
│         ─────────────────────               │
│                                             │
│         🎁 REWARD UNLOCKED:                 │
│         Bronze Training Shoes               │
│                                             │
│         [ Claim Reward ]                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Celebration Tiers

### Bronze Tier (3, 7 days)

**Visual:**
- Standard confetti + bronze sparkles
- Badge appears with simple fade-in
- Warm, encouraging tone

**Audio (optional):**
- Gentle achievement sound

**Rewards:**
- Badge added to collection
- Basic gear unlock (if avatar system exists)

### Silver Tier (14, 30 days)

**Visual:**
- Enhanced confetti (more, longer duration)
- Silver sparkles/shimmer effect
- Badge has shine animation
- Screen flash effect

**Audio (optional):**
- More impressive achievement sound
- Short crowd cheer

**Rewards:**
- Badge added to collection
- Better gear unlock
- **30-day:** Parent notification sent

### Gold Tier (50, 100 days)

**Visual:**
- Premium confetti (gold pieces mixed in)
- Gold particle effects
- Badge reveal with dramatic animation
- Background glow effect

**Audio (optional):**
- Epic achievement sound
- Longer celebration audio

**Rewards:**
- Premium badge
- Rare gear unlock
- **100-day:** Special "Century Club" status
- Parent notification sent

### Platinum/Legendary (200, 365 days)

**Visual:**
- Maximum celebration
- Rainbow/prismatic effects
- Animated badge with special effects
- Full-screen takeover

**Rewards:**
- Exclusive badge (animated)
- Legendary gear
- Profile flair/status
- Parent notification sent

---

## Badge Design

### Badge Structure

Each badge has:
- Icon (unique per milestone)
- Name
- Description
- Tier (affects border/glow color)
- Unlock date

### Badge Visual Hierarchy

```
Bronze:  Simple border, muted colors
Silver:  Subtle shine, brighter colors
Gold:    Glowing border, rich colors
Platinum: Animated glow, premium feel
Legendary: Animated with particle effects
```

### Badge Display Locations

1. **Milestone celebration:** Large, animated reveal
2. **Profile/Trophy case:** Medium, in collection grid
3. **Dashboard streak widget:** Small icon indicator
4. **Avatar (future):** Equipped as flair

---

## Technical Implementation

### Schema

```typescript
// convex/schema.ts additions

// Milestone definitions (could be seeded or hardcoded)
const streakMilestones = [
  { days: 3, name: "Warming Up", tier: "bronze" },
  { days: 7, name: "Week Warrior", tier: "bronze" },
  { days: 14, name: "Two Week Titan", tier: "silver" },
  { days: 30, name: "Monthly Monster", tier: "silver" },
  { days: 50, name: "Fifty Fire", tier: "gold" },
  { days: 100, name: "Century Club", tier: "gold" },
  { days: 200, name: "Double Century", tier: "platinum" },
  { days: 365, name: "Year of the Beast", tier: "legendary" },
]

// User achievements table
userAchievements: defineTable({
  userId: v.id("users"),
  achievementType: v.string(),  // "streak_7", "streak_30", etc.
  achievementName: v.string(),  // "Week Warrior"
  tier: v.string(),             // "bronze", "silver", etc.
  unlockedAt: v.number(),
  seen: v.boolean(),            // Has user seen the celebration?
})
```

### Convex Functions

```typescript
// convex/streaks.ts

// Check if streak hits a milestone
export const checkStreakMilestone = (currentStreak: number): Milestone | null => {
  const milestones = [3, 7, 14, 30, 50, 100, 200, 365]
  if (milestones.includes(currentStreak)) {
    return getMilestoneDetails(currentStreak)
  }
  return null
}

// Called after workout completion
export const updateStreakAndCheckMilestone = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Calculate new streak
    // 2. Update streak in user_progress
    // 3. Check if milestone reached
    // 4. If milestone, create achievement record
    // 5. Return { newStreak, milestone: Milestone | null }
  }
})
```

### Component Structure

```
components/
  celebrations/
    MilestoneOverlay.tsx        # Full celebration overlay
    BadgeReveal.tsx             # Animated badge unlock
    MilestoneConfetti.tsx       # Tier-specific confetti
    RewardDisplay.tsx           # Shows gear/reward unlocked

lib/
  constants/
    streakMilestones.ts         # Milestone definitions
    milestoneCopy.ts            # Celebration messages per milestone
```

### MilestoneOverlay Component

```tsx
interface MilestoneOverlayProps {
  visible: boolean
  milestone: {
    days: number
    name: string
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'
    message: string
    reward?: {
      type: 'gear' | 'badge'
      name: string
      imageUrl?: string
    }
  }
  onClaim: () => void
  onDismiss: () => void
}
```

---

## Milestone Messages

### 3 Days - "Warming Up"
```
"Three days in a row. You're building the habit. Keep it going!"
```

### 7 Days - "Week Warrior"
```
"A full week of training. Most people quit by now. You didn't."
```

### 14 Days - "Two Week Titan"
```
"Two weeks of consistency. Your body is adapting. Your competition isn't keeping up."
```

### 30 Days - "Monthly Monster"
```
"30 days. A full month of dedication. This is what separates good from great."
```

### 50 Days - "Fifty Fire"
```
"50 days of showing up. You're not just training—you're transforming."
```

### 100 Days - "Century Club"
```
"100 days. Welcome to the Century Club. Less than 1% make it here. You did."
```

### 200 Days - "Double Century"
```
"200 days. At this point, training isn't what you do—it's who you are."
```

### 365 Days - "Year of the Beast"
```
"365 days. A full year. You've done what almost no one does. You're a legend."
```

---

## Parent Notifications

For milestones 30+ days, notify the parent:

**30 Days:**
```
Subject: [Child] hit a 30-day training streak! 🎉

[Child] just completed their 30th consecutive day of training.

That's a full month of dedication and consistency. This kind of commitment
is what separates casual athletes from serious competitors.

Celebrate this win with them!
```

**100 Days:**
```
Subject: INCREDIBLE: [Child] hit 100 days! 🏆

[Child] just achieved something remarkable—100 consecutive days of training.

Less than 1% of athletes maintain this level of consistency.
They've earned the "Century Club" badge and proven they have what it takes.

This deserves a real celebration.
```

---

## Integration Flow

```
1. User completes workout
   ↓
2. updateStreakAndCheckMilestone() called
   ↓
3. Returns { newStreak: 7, milestone: {...} }
   ↓
4. WorkoutCompletionOverlay shows standard celebration
   ↓
5. After standard celebration, check if milestone
   ↓
6. If milestone → Show MilestoneOverlay
   ↓
7. User taps "Claim Reward"
   ↓
8. Mark achievement as seen, unlock reward
   ↓
9. Return to dashboard
```

---

## Acceptance Criteria

- [ ] All 8 milestones defined and recognized
- [ ] Each tier has distinct visual celebration
- [ ] Badge reveals with appropriate animation per tier
- [ ] Milestone message displayed correctly
- [ ] Achievement saved to user record
- [ ] Reward unlocked (if avatar/gear system exists)
- [ ] Parent notified for 30+ day milestones
- [ ] Celebration can be dismissed
- [ ] Achievement marked as "seen" after celebration
- [ ] Works offline (celebration shows, sync later)

---

## Testing Requirements

### Unit Tests
```typescript
describe('checkStreakMilestone', () => {
  it('returns null for non-milestone days', () => {})
  it('returns milestone for day 3', () => {})
  it('returns milestone for day 7', () => {})
  it('returns correct tier for each milestone', () => {})
})

describe('MilestoneOverlay', () => {
  it('renders with correct milestone name', () => {})
  it('shows appropriate tier styling', () => {})
  it('calls onClaim when button pressed', () => {})
})
```

### Manual Testing Checklist
- [ ] Test each milestone (3, 7, 14, 30, 50, 100)
- [ ] Verify tier-appropriate celebration
- [ ] Check badge appears in collection after
- [ ] Verify parent notification sent (30+)
- [ ] Test dismissing celebration

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Milestone definitions + constants | 1-2 hours |
| MilestoneOverlay component | 4-6 hours |
| BadgeReveal animation | 3-4 hours |
| Tier-specific confetti variants | 2-3 hours |
| Achievement storage (Convex) | 2-3 hours |
| Integration with workout flow | 2-3 hours |
| Parent notifications | 2-3 hours |
| Testing | 3-4 hours |
| **Total** | **3-5 days** |

---

## Dependencies

- Streak calculation working (PRODUCT_ROADMAP.md immediate to-do)
- WorkoutCompletionOverlay (WORKOUT_CELEBRATIONS_PLAN.md)
- Achievement storage schema

---

## Future Enhancements

- [ ] Streak recovery option (streak freeze)
- [ ] Social sharing of milestones
- [ ] Leaderboard for longest streaks
- [ ] Custom milestone celebrations per sport
- [ ] "Near milestone" encouragement ("2 more days to Week Warrior!")

---

## Related Documents

- [WORKOUT_CELEBRATIONS_PLAN.md](./WORKOUT_CELEBRATIONS_PLAN.md) - Standard completion flow
- [ACHIEVEMENT_SYSTEM_PLAN.md](./ACHIEVEMENT_SYSTEM_PLAN.md) - Full badge system
- [FUN_FACTOR_PLAN.md](./FUN_FACTOR_PLAN.md) - Overall gamification
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Immediate to-dos

---

*Status: Planning*
*Effort: 3-5 days*
*Priority: 🟠 High*
*Dependency: Streak calculation must be complete*
