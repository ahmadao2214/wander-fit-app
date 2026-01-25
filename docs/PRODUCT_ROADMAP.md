# Wander-Fit Product Roadmap

> Based on technical advisor feedback from Loukman (January 2026)

## Executive Summary

This roadmap prioritizes features that shift the app toward a **kid-focused experience with strong engagement mechanics**. The core insight: junior athletes (10-17) desperately want to reach the next level, and quick wins + visible progress keep them motivated.

**Key Strategic Shifts:**
- Kid motivation is paramount (streaks, celebrations, visible progress)
- COPPA compliance is non-negotiable for under-13 users
- Simplify terminology (GPP/SPP/SSP → kid-friendly names)
- Notifications keep athletes engaged and parents informed

> **Parent Experience:** See [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md) for comprehensive parent feature planning. PR #30 implements the core parent infrastructure.

---

## Current Status

### Already Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Athlete workout execution | ✅ Complete | `app/(athlete)/` |
| Phase-based programming (GPP/SPP/SSP) | ✅ Complete | `convex/userPrograms.ts` |
| 1RM tracking | ✅ Complete | `convex/userMaxes.ts` |
| Workout reordering | ✅ Complete | `app/(athlete)/program.tsx` |
| Training science education | ✅ Complete | `app/(athlete)/profile/training-science.tsx` |
| **Parent dashboard & controls** | ✅ PR #30 | `app/(parent)/` |
| **Parent-athlete linking** | ✅ PR #30 | `convex/parentRelationships.ts` |
| **Family calendar** | ✅ PR #30 | `components/parent/FamilyCalendar.tsx` |

### Partially Implemented

| Feature | Status | Gap |
|---------|--------|-----|
| Streaks | ⚠️ Data model exists | Not calculated on workout completion |
| Progress metrics | ⚠️ Displayed | Not celebrated |

---

## Phase 1: Quick Wins & Engagement

### 1.1 Fix Streak Calculation

**Priority:** 🔴 Critical
**Effort:** Small (1-2 days)
**Dependencies:** None

#### Problem Statement
Streaks exist in the database (`currentStreak`, `longestStreak` in `user_progress`) but are never updated when workouts are completed. This is a quick win that's already mostly built.

#### Technical Requirements

**New Convex Function (`convex/streaks.ts`):**
```typescript
export const updateStreakOnCompletion = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Get user's training frequency (days per week from intake)
    // 2. Get last completed workout date
    // 3. Calculate if completion is within streak window
    // 4. Update currentStreak (increment or reset to 1)
    // 5. Update longestStreak if current exceeds it
    // 6. Return milestone info if applicable
  }
})

export const checkStreakBreak = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Returns true if streak is at risk of breaking
  }
})
```

**Streak Window Logic:**
| Training Days/Week | Max Gap Before Streak Breaks |
|--------------------|------------------------------|
| 3 days | 3 days without workout |
| 4 days | 2 days without workout |
| 5 days | 2 days without workout |
| 6+ days | 1 day without workout |

#### Acceptance Criteria
- [ ] Completing a workout increments `currentStreak`
- [ ] `longestStreak` updates when `currentStreak` exceeds it
- [ ] Streak resets to 0 if user misses too many days
- [ ] Dashboard displays accurate streak count
- [ ] Returns milestone info (hit 7, 14, 30, etc.)

#### Files to Create/Modify
- `convex/streaks.ts` - New file for streak logic
- `convex/gppWorkoutSessions.ts` - Call streak update on completion
- `convex/userProgress.ts` - Ensure streak fields initialized

#### Testing Requirements
- Unit tests for streak calculation logic
- Test streak increment on completion
- Test streak reset after gap
- Test longest streak tracking

---

### 1.2 Workout Completion Celebrations

**Priority:** 🔴 Critical
**Effort:** Small (2-3 days)
**Dependencies:** None

#### Problem Statement
Completing a workout should feel rewarding. Kids love immediate positive feedback.

#### Technical Requirements

**New Components:**
```
components/
  celebrations/
    ConfettiEffect.tsx       # Confetti animation
    CompletionOverlay.tsx    # Full-screen celebration
    StreakBadge.tsx          # Animated streak display
```

**Completion Screen Enhancements:**
```tsx
// After workout completion
<CompletionOverlay>
  <ConfettiEffect />
  <AnimatedCheckmark />
  <Text>"Workout Complete!"</Text>
  <StreakBadge streak={currentStreak} isNew={streakIncreased} />
  <WorkoutSummary duration={...} exercises={...} />
  <MotivationalQuote />
</CompletionOverlay>
```

**Motivational Quotes (sport-specific):**
- "Champions are made in training. You just got stronger."
- "That's {X} workouts done. Your competition is still on the couch."
- "Another day, another step toward your goals."

#### Acceptance Criteria
- [ ] Confetti animation plays on workout complete
- [ ] Animated checkmark provides visual feedback
- [ ] Streak prominently displayed with animation if increased
- [ ] Session summary shows key stats
- [ ] Motivational message shown
- [ ] Smooth transition to dashboard

#### Files to Create
- `components/celebrations/ConfettiEffect.tsx`
- `components/celebrations/CompletionOverlay.tsx`
- `lib/constants/motivationalQuotes.ts`

#### Files to Modify
- `app/(athlete)/workout/execute/[id].tsx` - Completion flow

---

### 1.3 Streak Milestone Celebrations

**Priority:** 🟠 High
**Effort:** Medium (3-5 days)
**Dependencies:** 1.1 Streak Calculation

#### Problem Statement
Kids love seeing progress quickly. Reaching streak milestones should feel special and motivating.

#### Milestone Definitions

| Streak | Name | Celebration |
|--------|------|-------------|
| 3 days | "Getting Started" | Small confetti, encouraging message |
| 7 days | "One Week Strong" | Larger celebration, badge unlock |
| 14 days | "Two Week Warrior" | Special animation |
| 30 days | "Monthly Master" | Major celebration, achievement badge |
| 50 days | "Elite Consistency" | Premium badge |
| 100 days | "Century Club" | Ultimate celebration |

#### Technical Requirements

**Schema Addition:**
```typescript
// convex/schema.ts
userAchievements: defineTable({
  userId: v.id("users"),
  achievementType: v.string(), // "streak_7", "streak_30", etc.
  unlockedAt: v.number(),
  seen: v.boolean(),
})
```

**New Components:**
```
components/
  celebrations/
    StreakCelebration.tsx    # Milestone modal
    BadgeReveal.tsx          # Badge unlock animation
```

#### Acceptance Criteria
- [ ] Celebration modal appears at milestones
- [ ] Each milestone has unique visual treatment
- [ ] Badges permanently stored and viewable
- [ ] Can be dismissed to continue

#### Files to Create
- `components/celebrations/StreakCelebration.tsx`
- `components/celebrations/BadgeReveal.tsx`
- `convex/achievements.ts`

#### Files to Modify
- `convex/schema.ts` - Add achievements table
- `convex/streaks.ts` - Return milestone triggers

---

### 1.4 Kid-Friendly Phase Naming

**Priority:** 🟡 Medium
**Effort:** Small (1-2 days)
**Dependencies:** None

#### Problem Statement
"GPP", "SPP", and "SSP" are technical terms that may intimidate young athletes.

#### Naming Proposal

| Technical | Kid-Friendly | Icon | Description |
|-----------|--------------|------|-------------|
| GPP | "Build Your Base" | 🌱 | Build your athletic foundation |
| SPP | "Level Up" | 🔥 | Get sport-specific strong |
| SSP | "Game Time" | 🏆 | Peak for competition |

**Alternative:** "Get Ready" → "Get Stronger" → "Get There"

#### Technical Requirements

**Display Name Mapping:**
```typescript
// lib/constants/phases.ts
export const PHASE_DISPLAY = {
  GPP: {
    technical: "GPP",
    friendly: "Build Your Base",
    icon: "🌱",
    tagline: "Build your athletic foundation"
  },
  SPP: {
    technical: "SPP",
    friendly: "Level Up",
    icon: "🔥",
    tagline: "Get sport-specific strong"
  },
  SSP: {
    technical: "SSP",
    friendly: "Game Time",
    icon: "🏆",
    tagline: "Peak for competition"
  }
} as const

// Usage in components
const phaseName = useKidFriendlyNames
  ? PHASE_DISPLAY[phase].friendly
  : PHASE_DISPLAY[phase].technical
```

#### Acceptance Criteria
- [ ] All user-facing phase names use friendly versions
- [ ] Icons consistently represent phases
- [ ] Training Science section explains both names
- [ ] Optional toggle in settings for technical names

#### Files to Create
- `lib/constants/phases.ts`

#### Files to Modify
- `app/(athlete)/index.tsx` - Dashboard phase display
- `app/(athlete)/program.tsx` - Program browser
- `components/workout/PhaseBadge.tsx` - Badge component
- `app/(onboarding)/` - Onboarding screens

---

### 1.5 Make the App More Fun & Approachable for Kids

**Priority:** 🟠 High
**Effort:** Medium (ongoing)
**Dependencies:** None

#### Problem Statement
**Loukman's Note:** "Can we make the app more fun and approachable for the kid?"

The app needs to feel exciting and engaging for young athletes, not like a chore. Current UX may feel too "adult" or clinical.

#### Areas to Evaluate

| Area | Current State | Kid-Friendly Improvement |
|------|---------------|-------------------------|
| **Onboarding** | Educational, text-heavy | More visual, interactive, gamified |
| **Dashboard** | Stats-focused | Progress visualizations, character/avatar? |
| **Workout execution** | Functional | Encouraging feedback, sound effects? |
| **Language/copy** | Neutral/technical | Energetic, motivational, age-appropriate |
| **Visual design** | Clean, minimal | More color, animation, personality |
| **Empty states** | Basic | Fun illustrations, encouraging messages |

#### Ideas to Explore

**Quick Wins:**
- [ ] Add encouraging micro-copy throughout ("Let's go!", "You've got this!")
- [ ] Use more emojis in appropriate places
- [ ] Add subtle animations to progress indicators
- [ ] Celebratory sounds on workout completion (optional)

**Medium Effort:**
- [ ] Athlete avatar/character that "grows" with progress
- [ ] Visual progress map (journey/path metaphor)
- [ ] Daily motivational message on dashboard
- [ ] Exercise demo videos with young athletes

**Larger Features:**
- [ ] Mascot/character guide for onboarding
- [ ] Achievement "showcase" to share with friends/family
- [ ] Customizable themes/colors
- [ ] Mini-games for rest periods?

#### Research Needed

| Question | Method |
|----------|--------|
| What apps do our target kids already love? | User interviews |
| What makes them open an app daily? | User interviews |
| What feels "lame" or "boring" to them? | User interviews |
| What do successful kids' fitness apps do well? | Competitive analysis |

#### Competitive Inspiration
- **Duolingo** - Streaks, characters, playful copy, celebration animations
- **Headspace Kids** - Friendly illustrations, simple language
- **Pokemon GO** - Collection mechanics, visual progress
- **Strava** - Social motivation, achievement badges

#### Action Items

| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| Audit current app for "fun factor" | | ⬜ TODO | Where does it feel dry/boring? |
| Interview 5 kids about favorite apps | | ⬜ TODO | What makes them engaging? |
| Competitive analysis: kids' fitness/health apps | | ⬜ TODO | What works? What doesn't? |
| Create mood board for "fun" direction | | ⬜ TODO | Visual inspiration |
| Prioritize quick wins from ideas list | | ⬜ TODO | Low effort, high impact first |
| Test updated copy with target users | | ⬜ TODO | Does it resonate? |

#### Acceptance Criteria
- [ ] Kids describe the app as "fun" or "cool" in user testing
- [ ] Increased daily active usage (engagement metric)
- [ ] Workout completion rates improve
- [ ] Positive feedback on app store reviews mentioning UX

---

## Phase 2: COPPA Compliance

> **Note:** Detailed in [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md)

### 2.1 Age Gate at Sign-Up

**Priority:** 🔴 Critical (Legal)
**Effort:** Small (2-3 days)

Add age question before account creation. Under-13 users directed to parent sign-up flow.

### 2.2 Parent Creates Child Account

**Priority:** 🔴 Critical (Legal)
**Effort:** Medium (1 week)

Parents can create child accounts without collecting child's email.

### 2.3 Child Access Without Email

**Priority:** 🔴 Critical (Legal)
**Effort:** Medium (1 week)

Children access app via device-based auth or PIN, no email required.

### 2.4 Data Anonymization

**Priority:** 🔴 Critical (Legal)
**Effort:** Small (2-3 days)

Ensure minimal PII collection for minors.

---

## Phase 3: Notifications

### 3.1 Push Notification System

**Priority:** 🟠 High
**Effort:** Large (1-2 weeks)
**Dependencies:** None (can run parallel to other work)

#### Problem Statement
Users have no reminders to complete workouts, and parents have no visibility without opening the app.

#### Notification Types

**Athlete Notifications:**
| Type | Trigger | Message |
|------|---------|---------|
| Workout Reminder | Daily at set time | "Time to train! Today's workout is ready." |
| Streak at Risk | 24h before break | "Don't lose your 7-day streak!" |
| Achievement Unlocked | On badge unlock | "You earned Week Warrior!" |
| Phase Complete | On phase finish | "You completed Build Your Base!" |

**Parent Notifications:** (detailed in PARENT_EXPERIENCE_PLAN.md)

#### Technical Requirements

**Setup:**
```typescript
// lib/notifications/setup.ts
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications() {
  // Request permissions
  // Get Expo push token
  // Store in Convex
}
```

**Schema:**
```typescript
users: defineTable({
  // ... existing
  expoPushToken: v.optional(v.string()),
  notificationPreferences: v.optional(v.object({
    workoutReminders: v.boolean(),
    reminderTime: v.string(), // "09:00"
    streakAlerts: v.boolean(),
    achievements: v.boolean(),
  })),
})
```

#### Acceptance Criteria
- [ ] Permission requested during onboarding
- [ ] Users can set reminder time
- [ ] Daily workout reminders work
- [ ] Streak-at-risk alerts work
- [ ] Preferences toggleable in settings

#### Files to Create
- `lib/notifications/setup.ts`
- `lib/notifications/handlers.ts`
- `convex/notifications.ts`
- `app/(athlete)/profile/notifications.tsx`

---

### 3.2 Email Notifications (Parents Only)

**Priority:** 🟡 Medium
**Effort:** Medium (1 week)
**Dependencies:** Parent features (PR #30)

See [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md) for details.

---

## Phase 4: Achievement System

### 4.1 Full Badge/Achievement System

**Priority:** 🟡 Medium
**Effort:** Medium (1 week)
**Dependencies:** 1.3 Streak Celebrations

#### Badge Categories

**Consistency:**
- First Workout, Week One, Streak milestones

**Progress:**
- Phase Pioneer (GPP done), Level Up (SPP done), Peak Performer (SSP done)

**Strength:**
- First Max, Stronger (beat PR), 10% Gain

**Dedication:**
- Early Bird (before 8am), Weekend Warrior

#### Technical Requirements

**Schema:**
```typescript
achievements: defineTable({
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("consistency"),
    v.literal("progress"),
    v.literal("strength"),
    v.literal("dedication")
  ),
  iconUrl: v.optional(v.string()),
})
```

**Achievement Gallery Screen:**
- Show all badges (locked/unlocked)
- Tap for details
- Share individual achievements

#### Files to Create
- `app/(athlete)/profile/achievements.tsx`
- `components/achievements/BadgeCard.tsx`
- `components/achievements/AchievementGallery.tsx`
- `convex/seed/achievements.ts`

---

## Phase 5: Future Enhancements

| Feature | Notes | Priority |
|---------|-------|----------|
| **Wearable Integration** | Apple Watch companion app | 🟢 Future |
| **Advanced Analytics** | Strength progression charts | 🟢 Future |
| **Social/Leaderboards** | Compare with friends | 🟢 Future |
| **Custom Rewards** | Parent-set goals/rewards | 🟢 Future |

---

## Priority Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Fix Streak Calculation | High | Small | 🔴 Critical | 1 |
| Workout Celebrations | High | Small | 🔴 Critical | 1 |
| Streak Milestones | High | Medium | 🟠 High | 1 |
| Kid-Friendly Naming | Medium | Small | 🟡 Medium | 1 |
| Fun & Approachable UX | High | Medium | 🟠 High | 1 |
| Age Gate (COPPA) | High | Small | 🔴 Critical | 2 |
| Parent Creates Child | High | Medium | 🔴 Critical | 2 |
| Child Access No Email | High | Medium | 🔴 Critical | 2 |
| Push Notifications | High | Large | 🟠 High | 3 |
| Email Notifications | Medium | Medium | 🟡 Medium | 3 |
| Achievement System | Medium | Medium | 🟡 Medium | 4 |
| Wearable Integration | Low | Very Large | 🟢 Future | 5 |

---

## Related Documents

- [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md) - Parent features & COPPA details
- [INTAKE_ONBOARDING_PLAN.md](./INTAKE_ONBOARDING_PLAN.md) - Onboarding flow
- [CATEGORY_EXERCISE_EXPANSION_PLAN.md](./CATEGORY_EXERCISE_EXPANSION_PLAN.md) - Exercise content

---

*Last Updated: January 2026*
*Based on feedback from: Loukman (Technical Advisor)*
