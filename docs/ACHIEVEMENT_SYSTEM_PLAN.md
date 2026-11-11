# Achievement System Plan

> Badges, collectibles, and ways to show progress

## Overview

**Goal:** Create a comprehensive achievement system that gives kids multiple ways to earn recognition and feel accomplished beyond just streak milestones.

**Current State:** No achievement system exists. Streak milestones will be the first achievements (see STREAK_MILESTONES_PLAN.md).

---

## Achievement Categories

### 1. Consistency Achievements

Rewarding regular training habits.

| Badge | Slug | Criteria | Tier |
|-------|------|----------|------|
| First Step | `first_workout` | Complete 1 workout | Common |
| Week One | `week_one` | Complete first 7 days of program | Common |
| Warming Up | `streak_3` | 3-day streak | Bronze |
| Week Warrior | `streak_7` | 7-day streak | Bronze |
| Two Week Titan | `streak_14` | 14-day streak | Silver |
| Monthly Monster | `streak_30` | 30-day streak | Silver |
| Fifty Fire | `streak_50` | 50-day streak | Gold |
| Century Club | `streak_100` | 100-day streak | Gold |
| Double Century | `streak_200` | 200-day streak | Platinum |
| Year of the Beast | `streak_365` | 365-day streak | Legendary |

### 2. Progress Achievements

Rewarding program completion.

| Badge | Slug | Criteria | Tier |
|-------|------|----------|------|
| Foundation Builder | `phase_gpp` | Complete GPP phase | Silver |
| Level Up Legend | `phase_spp` | Complete SPP phase | Silver |
| Peak Performer | `phase_ssp` | Complete SSP phase | Silver |
| Full Cycle | `full_cycle` | Complete all 3 phases | Gold |
| Comeback Kid | `comeback` | Return after 2+ week break | Bronze |
| Double Cycle | `double_cycle` | Complete 2 full program cycles | Platinum |

### 3. Strength Achievements

Rewarding strength gains.

| Badge | Slug | Criteria | Tier |
|-------|------|----------|------|
| First Max | `first_1rm` | Record first 1RM | Common |
| Getting Stronger | `beat_1rm` | Beat any previous 1RM | Bronze |
| 10% Club | `gain_10pct` | Improve any 1RM by 10% | Silver |
| 25% Club | `gain_25pct` | Improve any 1RM by 25% | Gold |
| Double Up | `gain_100pct` | Double any starting 1RM | Legendary |
| Triple Threat | `all_1rm` | Record 1RM for all 3 core lifts | Silver |

### 4. Dedication Achievements

Rewarding special effort.

| Badge | Slug | Criteria | Tier |
|-------|------|----------|------|
| Early Bird | `early_bird` | 5 workouts before 7am | Bronze |
| Night Owl | `night_owl` | 5 workouts after 8pm | Bronze |
| Weekend Warrior | `weekend_warrior` | 10 weekend workouts | Bronze |
| All Weather | `all_months` | Workout in every month of year | Gold |
| Iron Will | `longest_workout` | Complete a 90+ minute workout | Silver |

### 5. Secret Achievements (Hidden)

Surprise rewards for special moments.

| Badge | Slug | Criteria | Tier | Hidden Until |
|-------|------|----------|------|--------------|
| Birthday Beast | `birthday` | Workout on your birthday | Rare | Unlocked |
| New Year, New Me | `new_year` | Workout on Jan 1 | Rare | Unlocked |
| First of the Year | `first_of_year` | First workout of the year | Bronze | Unlocked |
| 5AM Club | `5am_club` | Complete workout at 5am | Rare | Unlocked |
| Holiday Grinder | `holiday` | Workout on a major holiday | Silver | Unlocked |

---

## Achievement Tiers

| Tier | Color | Rarity | Examples |
|------|-------|--------|----------|
| Common | Gray | Easy to get | First Workout, First Max |
| Bronze | Bronze/Brown | Entry level | Streak 3, Early Bird |
| Silver | Silver | Moderate effort | Phase Complete, 10% Club |
| Gold | Gold | Significant effort | Full Cycle, Century Club |
| Platinum | Purple/Iridescent | Major commitment | Double Century |
| Legendary | Rainbow/Animated | Extraordinary | Year of the Beast, Double Up |
| Rare | Teal/Special | Hidden/Secret | Birthday Beast |

---

## Technical Implementation

### Schema

```typescript
// convex/schema.ts

// Achievement definitions (seeded data)
achievements: defineTable({
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("consistency"),
    v.literal("progress"),
    v.literal("strength"),
    v.literal("dedication"),
    v.literal("secret")
  ),
  tier: v.union(
    v.literal("common"),
    v.literal("bronze"),
    v.literal("silver"),
    v.literal("gold"),
    v.literal("platinum"),
    v.literal("legendary"),
    v.literal("rare")
  ),
  iconUrl: v.optional(v.string()),
  isHidden: v.boolean(),  // Hidden until unlocked (secret achievements)
  criteria: v.object({
    type: v.string(),     // "streak", "phase_complete", "1rm_gain", etc.
    value: v.optional(v.number()),
    metadata: v.optional(v.any()),
  }),
}).index("by_slug", ["slug"])
  .index("by_category", ["category"]),

// User's unlocked achievements
userAchievements: defineTable({
  userId: v.id("users"),
  achievementId: v.id("achievements"),
  achievementSlug: v.string(),  // Denormalized for easy querying
  unlockedAt: v.number(),
  seen: v.boolean(),  // Has user seen the unlock celebration?
  metadata: v.optional(v.any()),  // e.g., { newValue: 225, previousValue: 200 }
}).index("by_user", ["userId"])
  .index("by_user_achievement", ["userId", "achievementSlug"]),
```

### Achievement Checker

```typescript
// convex/achievements.ts

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Check and award achievements after relevant actions
export const checkAndAwardAchievements = mutation({
  args: {
    userId: v.id("users"),
    trigger: v.string(),  // "workout_complete", "1rm_update", "phase_complete"
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const newAchievements: Achievement[] = []

    // Get all achievements
    const achievements = await ctx.db.query("achievements").collect()

    // Get user's existing achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()

    const unlockedSlugs = new Set(userAchievements.map((a) => a.achievementSlug))

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedSlugs.has(achievement.slug)) continue

      const earned = await checkAchievementCriteria(
        ctx,
        args.userId,
        achievement,
        args.trigger,
        args.context
      )

      if (earned) {
        // Award the achievement
        await ctx.db.insert("userAchievements", {
          userId: args.userId,
          achievementId: achievement._id,
          achievementSlug: achievement.slug,
          unlockedAt: Date.now(),
          seen: false,
          metadata: args.context,
        })

        newAchievements.push(achievement)
      }
    }

    return newAchievements
  },
})

// Check specific achievement criteria
async function checkAchievementCriteria(
  ctx: any,
  userId: Id<"users">,
  achievement: Achievement,
  trigger: string,
  context: any
): Promise<boolean> {
  const { type, value } = achievement.criteria

  switch (type) {
    case "streak":
      return context?.currentStreak >= value

    case "workout_count":
      const count = await getWorkoutCount(ctx, userId)
      return count >= value

    case "phase_complete":
      return trigger === "phase_complete" &&
             context?.phase === achievement.criteria.metadata?.phase

    case "1rm_gain_percent":
      return trigger === "1rm_update" &&
             context?.percentGain >= value

    case "workout_time":
      return trigger === "workout_complete" &&
             context?.hour !== undefined &&
             checkTimeWindow(context.hour, achievement.criteria.metadata)

    case "date_match":
      return checkDateMatch(achievement.criteria.metadata)

    default:
      return false
  }
}
```

### Trigger Points

**Where to check for achievements:**

| Trigger | File | Achievements to Check |
|---------|------|----------------------|
| Workout complete | `gppWorkoutSessions.ts` | Streak, first workout, time-based, date-based |
| Phase complete | `userPrograms.ts` | Phase achievements, full cycle |
| 1RM update | `userMaxes.ts` | Strength achievements |
| App open | `users.ts` | Date-based (birthday, new year) |

---

## UI Components

### Achievement Gallery Screen

```
┌─────────────────────────────────────────────┐
│              🏆 ACHIEVEMENTS                │
├─────────────────────────────────────────────┤
│  CONSISTENCY      [████████░░] 8/10         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ✓  │ │ ✓  │ │ ✓  │ │ 🔒 │ │ 🔒 │   │
│  │ 🌱 │ │ 🔥 │ │ 💪 │ │ ??? │ │ ??? │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                             │
│  PROGRESS         [██████░░░░] 3/5          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ✓  │ │ 🔒 │ │ 🔒 │ │ 🔒 │ │ 🔒 │   │
│  │ 🏗️ │ │ ??? │ │ ??? │ │ ??? │ │ ??? │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                             │
│  STRENGTH         [████░░░░░░] 2/6          │
│  ...                                        │
│                                             │
│  SECRET           [██░░░░░░░░] 1/5          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ✓  │ │ ??? │ │ ??? │ │ ??? │ │ ??? │   │
│  │ 🎂 │ │     │ │     │ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────────────┘
```

### Badge Detail Modal

```
┌─────────────────────────────────────────────┐
│                                             │
│              [ Badge Icon ]                 │
│                  🔥                         │
│                                             │
│            "WEEK WARRIOR"                   │
│               Bronze Tier                   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  "Complete a 7-day workout streak"          │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Unlocked: January 15, 2026                 │
│                                             │
│            [ Close ]  [ Share ]             │
│                                             │
└─────────────────────────────────────────────┘
```

### Unlock Notification (In-App)

When achievement unlocks during app use:

```
┌─────────────────────────────────────────────┐
│  🏆 Achievement Unlocked!                   │
│                                             │
│  "Week Warrior" - 7-day streak              │
│                                             │
│  [ View ]                      [ Dismiss ]  │
└─────────────────────────────────────────────┘
```

---

## File Structure

```
convex/
  achievements.ts           # Achievement checking logic
  seed/
    achievements.ts         # Seed achievement definitions

components/
  achievements/
    AchievementGallery.tsx  # Full gallery view
    AchievementCard.tsx     # Single badge card
    AchievementDetail.tsx   # Detail modal
    AchievementUnlock.tsx   # Unlock notification
    LockedBadge.tsx         # Locked/hidden badge display

app/
  (athlete)/
    profile/
      achievements.tsx      # Gallery screen

lib/
  constants/
    achievements.ts         # Achievement definitions (shared)
```

---

## Seed Data

```typescript
// convex/seed/achievements.ts

export const achievementDefinitions = [
  // Consistency
  {
    slug: "first_workout",
    name: "First Step",
    description: "Complete your first workout",
    category: "consistency",
    tier: "common",
    isHidden: false,
    criteria: { type: "workout_count", value: 1 },
  },
  {
    slug: "streak_7",
    name: "Week Warrior",
    description: "Complete a 7-day workout streak",
    category: "consistency",
    tier: "bronze",
    isHidden: false,
    criteria: { type: "streak", value: 7 },
  },
  // ... more achievements

  // Secret
  {
    slug: "birthday",
    name: "Birthday Beast",
    description: "Work out on your birthday",
    category: "secret",
    tier: "rare",
    isHidden: true,
    criteria: { type: "date_match", metadata: { matchType: "birthday" } },
  },
]
```

---

## Achievement Unlock Flow

```
User Action (e.g., complete workout)
  ↓
Trigger achievement check
  ↓
checkAndAwardAchievements() runs
  ↓
Returns list of newly unlocked achievements
  ↓
If any new achievements:
  ↓
  ├─→ For first achievement: Show unlock modal
  │
  ├─→ For subsequent: Queue for display
  │
  └─→ Save all as "unseen"
  ↓
User views achievement gallery
  ↓
Mark achievements as "seen"
```

---

## Acceptance Criteria

- [ ] All achievements defined and seeded
- [ ] Achievement checking runs on relevant triggers
- [ ] New achievements unlock correctly
- [ ] Unlock notification appears in-app
- [ ] Achievement gallery shows all badges
- [ ] Locked badges show appropriately
- [ ] Secret badges hidden until unlocked
- [ ] Detail modal shows full info
- [ ] Tier styling is distinct
- [ ] Duplicate achievements prevented

---

## Testing Requirements

### Unit Tests

```typescript
describe('checkAchievementCriteria', () => {
  it('awards streak achievement at correct count', () => {})
  it('awards first workout achievement', () => {})
  it('does not re-award existing achievement', () => {})
  it('checks date-based achievements correctly', () => {})
})

describe('AchievementGallery', () => {
  it('groups achievements by category', () => {})
  it('shows progress for each category', () => {})
  it('hides secret achievements until unlocked', () => {})
})
```

### Manual Testing

- [ ] Complete first workout → First Step badge
- [ ] Hit 7-day streak → Week Warrior badge
- [ ] Complete GPP phase → Foundation Builder badge
- [ ] Improve 1RM by 10% → 10% Club badge
- [ ] Verify gallery displays correctly

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Schema design | 1-2 hours |
| Achievement checker logic | 4-6 hours |
| Seed data creation | 2-3 hours |
| AchievementGallery screen | 4-6 hours |
| AchievementCard component | 2-3 hours |
| AchievementDetail modal | 2-3 hours |
| Unlock notification | 2-3 hours |
| Integration with triggers | 3-4 hours |
| Tier styling | 2-3 hours |
| Testing | 4-6 hours |
| **Total** | **1-2 weeks** |

---

## Future Enhancements

- [ ] Achievement sharing to social media
- [ ] Animated badges for legendary tier
- [ ] Achievement leaderboards
- [ ] Achievement-based rewards (gear unlocks)
- [ ] Team/squad achievements
- [ ] Seasonal achievements (holiday-specific)
- [ ] Sport-specific achievements

---

## Open Questions

- [ ] How many achievements at launch?
- [ ] Should achievements give tangible rewards?
- [ ] Should there be achievement point values?
- [ ] How to handle achievements for existing users (backfill)?

---

## Related Documents

- [STREAK_MILESTONES_PLAN.md](./STREAK_MILESTONES_PLAN.md) - Streak-specific achievements
- [FUN_FACTOR_PLAN.md](./FUN_FACTOR_PLAN.md) - Overall gamification
- [WORKOUT_CELEBRATIONS_PLAN.md](./WORKOUT_CELEBRATIONS_PLAN.md) - Unlock celebrations

---

*Status: Planning*
*Effort: 1-2 weeks*
*Priority: 🟡 Medium*
