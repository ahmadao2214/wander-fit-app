# Wander-Fit Product Roadmap

> Central hub for all product planning documents

## Immediate To-Do

### Fix Streak Calculation

**Priority:** 🔴 Critical
**Effort:** 1-2 days
**Status:** Not started

Streaks exist in the database (`currentStreak`, `longestStreak` in `user_progress`) but are never calculated or updated. This is the foundation for all engagement features.

**What to Build:**

```typescript
// convex/streaks.ts
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
```

**Streak Window Logic:**

| Training Days/Week | Max Gap Before Streak Breaks |
|--------------------|------------------------------|
| 3 days | 3 days without workout |
| 4 days | 2 days without workout |
| 5+ days | 2 days without workout |

**Files to Modify:**
- `convex/streaks.ts` - New file for streak logic
- `convex/gppWorkoutSessions.ts` - Call streak update on completion
- `convex/userProgress.ts` - Ensure fields initialized

**Acceptance Criteria:**
- [ ] Completing workout increments `currentStreak`
- [ ] `longestStreak` updates when exceeded
- [ ] Streak resets after gap
- [ ] Returns milestone info (7, 14, 30, etc.)

---

## Feature Plans

Detailed plans for each feature area:

| Feature | Document | Priority | Effort | Status |
|---------|----------|----------|--------|--------|
| **Workout Celebrations** | [WORKOUT_CELEBRATIONS_PLAN.md](./WORKOUT_CELEBRATIONS_PLAN.md) | 🔴 Critical | 2-3 days | Planning |
| **Streak Milestones** | [STREAK_MILESTONES_PLAN.md](./STREAK_MILESTONES_PLAN.md) | 🟠 High | 3-5 days | Planning |
| **Phase Naming** | [PHASE_NAMING_PLAN.md](./PHASE_NAMING_PLAN.md) | 🟡 Medium | 1-2 days | Planning |
| **Notifications** | [NOTIFICATIONS_PLAN.md](./NOTIFICATIONS_PLAN.md) | 🟠 High | 1-2 weeks | Planning |
| **Achievement System** | [ACHIEVEMENT_SYSTEM_PLAN.md](./ACHIEVEMENT_SYSTEM_PLAN.md) | 🟡 Medium | 1-2 weeks | Planning |
| **Fun Factor / Gamification** | [FUN_FACTOR_PLAN.md](./FUN_FACTOR_PLAN.md) | 🟠 High | Ongoing | Planning |
| **Parent Experience** | [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md) | 🟡 Medium | Varies | PR #30 + gaps |
| **Distribution & GTM** | [DISTRIBUTION_GTM_PLAN.md](./DISTRIBUTION_GTM_PLAN.md) | 🟡 Medium | N/A | Planning |

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. **Fix streak calculation** - Everything else depends on this
2. **Workout celebrations** - Immediate reward for completing workout

### Phase 2: Engagement (Weeks 2-3)
3. **Streak milestones** - Celebrate consistency achievements
4. **Phase naming** - Make app more approachable

### Phase 3: Retention (Weeks 4-6)
5. **Notifications** - Keep users coming back
6. **Achievement system** - More ways to feel accomplished

### Phase 4: Growth (Ongoing)
7. **Fun factor items** - Avatar, gear, social (per FUN_FACTOR_PLAN.md)
8. **Parent experience gaps** - COPPA, notifications (per PARENT_EXPERIENCE_PLAN.md)

---

## Current Status

### Already Built

| Feature | Status | Location |
|---------|--------|----------|
| Athlete workout execution | ✅ Complete | `app/(athlete)/` |
| Phase-based programming | ✅ Complete | `convex/userPrograms.ts` |
| 1RM tracking | ✅ Complete | `convex/userMaxes.ts` |
| Workout reordering | ✅ Complete | `app/(athlete)/program.tsx` |
| Training science education | ✅ Complete | `app/(athlete)/profile/` |
| Parent dashboard | ✅ PR #30 | `app/(parent)/` |
| Parent-athlete linking | ✅ PR #30 | `convex/parentRelationships.ts` |

### Partially Built

| Feature | Status | Gap |
|---------|--------|-----|
| Streaks | ⚠️ Schema exists | Not calculated |
| Progress display | ⚠️ Shows data | Not celebrated |

### Not Started

| Feature | Document |
|---------|----------|
| Celebrations | WORKOUT_CELEBRATIONS_PLAN.md |
| Achievements | ACHIEVEMENT_SYSTEM_PLAN.md |
| Push notifications | NOTIFICATIONS_PLAN.md |
| Avatar/gear system | FUN_FACTOR_PLAN.md |

---

## Dependencies

```
Fix Streak Calculation
        │
        ├──→ Workout Celebrations
        │           │
        │           └──→ Streak Milestones
        │                       │
        │                       └──→ Achievement System
        │
        └──→ Notifications (streak at risk)

Phase Naming ──→ (independent, can do anytime)

Fun Factor ──→ (depends on achievements + celebrations)
```

---

## Open Decisions

| Decision | Options | Document |
|----------|---------|----------|
| Avatar art style | Cartoon, Athletic, Pixel, None | FUN_FACTOR_PLAN.md |
| Social features scope | Friends only, Leaderboards, None | FUN_FACTOR_PLAN.md |
| Parent verification model | Every workout, Milestones, Trust | FUN_FACTOR_PLAN.md |
| Notification timing | User-set, Smart, Fixed | NOTIFICATIONS_PLAN.md |

---

## Quick Links

**Product Features:**
- [Workout Celebrations](./WORKOUT_CELEBRATIONS_PLAN.md)
- [Streak Milestones](./STREAK_MILESTONES_PLAN.md)
- [Phase Naming](./PHASE_NAMING_PLAN.md)
- [Notifications](./NOTIFICATIONS_PLAN.md)
- [Achievement System](./ACHIEVEMENT_SYSTEM_PLAN.md)
- [Fun Factor / Gamification](./FUN_FACTOR_PLAN.md)

**Business & Strategy:**
- [Parent Experience](./PARENT_EXPERIENCE_PLAN.md)
- [Distribution & GTM](./DISTRIBUTION_GTM_PLAN.md)

**Technical Reference:**
- [Exercise Expansion](./CATEGORY_EXERCISE_EXPANSION_PLAN.md)
- [Intake/Onboarding](./INTAKE_ONBOARDING_PLAN.md)

---

*Last Updated: January 2026*
*Based on feedback from: Loukman (Technical Advisor)*
