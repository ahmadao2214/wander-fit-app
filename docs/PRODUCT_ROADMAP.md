# Wander-Fit Product Roadmap

> Based on technical advisor feedback from Loukman (January 2026)

## Executive Summary

This roadmap prioritizes features that shift the app toward a **parent-gated, kid-focused experience** with strong engagement mechanics. The core insight: junior athletes (10-17) desperately want to reach the next level, and parents are the gatekeepers who will pay for/advocate for tools that help.

**Key Strategic Shifts:**
- Parent experience becomes primary (they control access, receive communications)
- Kid experience focuses on motivation, quick wins, and visible progress
- COPPA compliance is non-negotiable for under-13 users
- Simplify terminology (GPP/SPP/SSP → kid-friendly names)

---

## Phase 1: Compliance & Foundation

### 1.1 Parent Role & Account System

**Priority:** 🔴 Critical
**Effort:** Large (1-2 weeks)
**Dependencies:** None

#### Problem Statement
Current app collects email from all users including minors. COPPA requires verifiable parental consent for users under 13, and best practice is to minimize data collection from all minors.

#### Solution Overview
Implement a parent-gated onboarding flow where parents create accounts and link child athletes.

#### Technical Requirements

**Schema Changes (`convex/schema.ts`):**
```typescript
// Add to users table
role: v.union(v.literal("athlete"), v.literal("parent"), v.literal("coach")),
parentId: v.optional(v.id("users")), // Links child to parent
linkedChildren: v.optional(v.array(v.id("users"))), // For parent accounts

// New table for parent-child relationships
parentChildLinks: defineTable({
  parentId: v.id("users"),
  childId: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("active")),
  createdAt: v.number(),
})
```

**New Screens:**
| Screen | Path | Description |
|--------|------|-------------|
| Role Selection | `/(auth)/select-role.tsx` | "I'm a Parent" / "I'm an Athlete (18+)" |
| Parent Sign Up | `/(auth)/parent-sign-up.tsx` | Parent creates account with email |
| Add Child | `/(parent)/add-child.tsx` | Parent creates child profile (name only, no email) |
| Child PIN Setup | `/(parent)/child-pin.tsx` | Optional: 4-digit PIN for child to access app |
| Parent Dashboard | `/(parent)/index.tsx` | Overview of linked children's progress |

**Auth Flow Changes:**
```
Current:  Sign Up → Intake → Onboarding → Athlete Dashboard
Proposed: Role Select → [Parent Flow] or [Adult Athlete Flow]

Parent Flow:
  Parent Sign Up → Add Child → Child Intake → Parent Dashboard
  Child opens app → PIN entry → Athlete Dashboard

Adult Athlete Flow (18+):
  Sign Up → Age Verification → Intake → Onboarding → Athlete Dashboard
```

#### Acceptance Criteria
- [ ] Parents can create account with email
- [ ] Parents can add children without collecting child's email
- [ ] Children under 13 have no PII stored (no email, anonymized ID)
- [ ] Parent can view child's progress from parent dashboard
- [ ] Child can access app without needing to sign in (PIN or device-based)
- [ ] All notifications/emails go to parent account only

#### Files to Modify
- `convex/schema.ts` - Add parent role and relationships
- `convex/users.ts` - Add parent/child linking mutations
- `app/(auth)/_layout.tsx` - Add role selection routing
- `app/index.tsx` - Update auth routing logic
- `hooks/useAuth.ts` - Handle parent vs child auth states

#### Testing Requirements
- Unit tests for parent-child linking logic
- Integration tests for onboarding flows
- Manual testing for under-13 flow (no PII collection)

---

### 1.2 Child Data Anonymization

**Priority:** 🔴 Critical
**Effort:** Medium (3-5 days)
**Dependencies:** 1.1 Parent Role

#### Problem Statement
COPPA requires that apps either obtain verifiable parental consent or collect no personal information from children under 13.

#### Solution Overview
Child accounts store only:
- Display name (not legal name)
- Age group (range, not birthdate)
- Sport/training preferences
- Workout data

**NOT stored for children:**
- Email address
- Exact birthdate
- Location data
- Any PII that could identify the child

#### Technical Requirements

**Schema Updates:**
```typescript
// Users table modifications
users: defineTable({
  // ... existing fields
  isMinor: v.boolean(), // true for under-18
  ageGroup: v.union(
    v.literal("10-13"),
    v.literal("14-17"),
    v.literal("18+")
  ),
  // Email only required for non-minors and parents
  email: v.optional(v.string()),
})
```

**Convex Mutations:**
- `createChildAthlete` - Creates account without email
- `linkChildToParent` - Associates child with parent account

#### Acceptance Criteria
- [ ] Child accounts (under 18) do not require email
- [ ] Age group is stored as range, not exact birthdate
- [ ] No location data collected from minors
- [ ] Parent is the only contact point for communications
- [ ] Data export/deletion requests go through parent

#### Files to Modify
- `convex/schema.ts` - Update user schema for optional email
- `convex/users.ts` - Add child-specific creation mutation
- `app/(intake)/` - Update intake to skip email for children

---

### 1.3 Fix Streak Calculation

**Priority:** 🟠 High
**Effort:** Small (1-2 days)
**Dependencies:** None

#### Problem Statement
Streaks exist in the database (`currentStreak`, `longestStreak` in `user_progress`) but are never updated when workouts are completed.

#### Current State
```typescript
// convex/schema.ts - user_progress table
currentStreak: v.number(), // Always 0
longestStreak: v.number(), // Always 0
```

#### Solution Overview
Update streak values when a workout is marked complete. Streak logic:
- **Increment streak** if workout completed within expected cadence (user's training days/week)
- **Reset streak** if gap exceeds allowed threshold
- **Update longest** if current exceeds longest

#### Technical Requirements

**New Convex Function (`convex/streaks.ts`):**
```typescript
// Calculate and update streak on workout completion
export const updateStreakOnCompletion = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Get user's training frequency (days per week from intake)
    // 2. Get last completed workout date
    // 3. Calculate if this completion is within streak window
    // 4. Update currentStreak (increment or reset to 1)
    // 5. Update longestStreak if needed
  }
})

// Check for streak breaks (run daily via cron or on app open)
export const checkStreakBreak = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // If too many days since last workout, reset streak to 0
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
- [ ] Streak persists correctly across app sessions
- [ ] Dashboard displays accurate streak count

#### Files to Modify
- `convex/streaks.ts` - New file for streak logic
- `convex/gppWorkoutSessions.ts` - Call streak update on completion
- `convex/userProgress.ts` - Ensure streak fields are properly initialized

#### Testing Requirements
- Unit tests for streak calculation logic
- Test streak increment on completion
- Test streak reset after gap
- Test longest streak tracking

---

## Phase 2: Engagement & Motivation

### 2.1 Streak Milestone Celebrations

**Priority:** 🟠 High
**Effort:** Medium (3-5 days)
**Dependencies:** 1.3 Streak Calculation

#### Problem Statement
Kids love seeing progress and success quickly. Reaching streak milestones should feel rewarding and motivating.

#### Solution Overview
Display celebratory animations/screens when users hit streak milestones.

#### Milestone Definitions
| Streak | Name | Celebration |
|--------|------|-------------|
| 3 days | "Getting Started" | Small confetti, encouraging message |
| 7 days | "One Week Strong" | Larger celebration, badge unlock |
| 14 days | "Two Week Warrior" | Special animation, share prompt |
| 30 days | "Monthly Master" | Major celebration, achievement badge |
| 50 days | "Elite Consistency" | Premium badge, parent notification |
| 100 days | "Century Club" | Ultimate celebration |

#### Technical Requirements

**New Components:**
```
components/
  celebrations/
    StreakCelebration.tsx    # Modal with animation
    ConfettiEffect.tsx       # Confetti animation component
    BadgeUnlock.tsx          # Badge reveal animation
```

**Animation Library:**
- Use `react-native-reanimated` for smooth animations
- Use `lottie-react-native` for complex celebrations (optional)

**Badge Storage:**
```typescript
// Add to schema
userAchievements: defineTable({
  userId: v.id("users"),
  achievementType: v.string(), // "streak_7", "streak_30", etc.
  unlockedAt: v.number(),
  seen: v.boolean(), // Has user dismissed the celebration?
})
```

#### Acceptance Criteria
- [ ] Celebration modal appears when milestone is reached
- [ ] Each milestone has unique visual treatment
- [ ] Badges are permanently stored and viewable
- [ ] Celebrations can be dismissed
- [ ] Parent is notified of major milestones (30+)

#### UI/UX Specifications
- Celebration should auto-trigger after workout completion
- Include streak count prominently
- Motivational message personalized to sport
- "Share" button for social (optional)
- "Keep Going" CTA to dismiss

#### Files to Create
- `components/celebrations/StreakCelebration.tsx`
- `components/celebrations/ConfettiEffect.tsx`
- `convex/achievements.ts`

#### Files to Modify
- `convex/schema.ts` - Add achievements table
- `app/(athlete)/workout/complete.tsx` - Trigger celebration check

---

### 2.2 Workout Completion Celebrations

**Priority:** 🟠 High
**Effort:** Small (2-3 days)
**Dependencies:** None

#### Problem Statement
Completing a workout should feel rewarding. Currently, the completion experience is functional but not celebratory.

#### Solution Overview
Add satisfying animations and feedback when a workout is completed.

#### Technical Requirements

**Completion Screen Enhancements:**
```tsx
// app/(athlete)/workout/complete/[id].tsx
<YStack>
  <ConfettiEffect trigger={showCelebration} />

  <AnimatedCheckmark />

  <Text size="$8" fontWeight="bold">
    Workout Complete!
  </Text>

  <WorkoutSummary
    duration={session.duration}
    exercisesCompleted={session.exercisesCompleted}
    totalVolume={session.totalVolume}
  />

  <StreakUpdate
    previousStreak={prevStreak}
    newStreak={currentStreak}
  />

  <MotivationalQuote sport={user.sport} />

  <Button onPress={goToDashboard}>
    Back to Dashboard
  </Button>
</YStack>
```

**Motivational Quotes:**
- Sport-specific encouragement
- Random selection from curated list
- Examples:
  - "Champions are made in training. You just got stronger."
  - "That's [X] workouts completed. Your competition is still on the couch."

#### Acceptance Criteria
- [ ] Confetti animation plays on workout complete
- [ ] Animated checkmark provides visual feedback
- [ ] Session summary shows key stats
- [ ] Streak update is prominently displayed
- [ ] Motivational message is shown
- [ ] Smooth transition back to dashboard

#### Files to Modify
- `app/(athlete)/workout/execute/[id].tsx` - Completion flow
- `components/celebrations/` - Reuse confetti components

---

### 2.3 Achievement Badges System

**Priority:** 🟡 Medium
**Effort:** Medium (1 week)
**Dependencies:** 2.1 Streak Celebrations

#### Problem Statement
Beyond streaks, kids need multiple ways to feel accomplished and see progress.

#### Solution Overview
Implement a badge/achievement system with multiple categories of accomplishments.

#### Badge Categories

**Consistency Badges:**
| Badge | Criteria |
|-------|----------|
| First Workout | Complete 1 workout |
| Week One | Complete first week of program |
| Streak Starter | 3-day streak |
| Week Warrior | 7-day streak |
| Monthly Master | 30-day streak |
| Century Club | 100-day streak |

**Progress Badges:**
| Badge | Criteria |
|-------|----------|
| Phase Pioneer | Complete GPP phase |
| Level Up | Complete SPP phase |
| Peak Performer | Complete SSP phase |
| Full Cycle | Complete all 3 phases |

**Strength Badges:**
| Badge | Criteria |
|-------|----------|
| First Max | Record first 1RM |
| Stronger | Beat any previous 1RM |
| 10% Gain | Improve any 1RM by 10% |

**Dedication Badges:**
| Badge | Criteria |
|-------|----------|
| Early Bird | Complete workout before 8am |
| Night Owl | Complete workout after 8pm |
| Weekend Warrior | Complete weekend workouts |

#### Technical Requirements

**Schema:**
```typescript
achievements: defineTable({
  slug: v.string(), // "streak_7", "phase_complete_gpp"
  name: v.string(),
  description: v.string(),
  iconUrl: v.string(),
  category: v.union(
    v.literal("consistency"),
    v.literal("progress"),
    v.literal("strength"),
    v.literal("dedication")
  ),
  requirement: v.any(), // JSON criteria
})

userAchievements: defineTable({
  userId: v.id("users"),
  achievementId: v.id("achievements"),
  unlockedAt: v.number(),
  seen: v.boolean(),
})
```

**New Screen - Achievements Gallery:**
```
app/(athlete)/profile/achievements.tsx
```

#### Acceptance Criteria
- [ ] Achievement definitions seeded in database
- [ ] Badges unlock automatically when criteria met
- [ ] Notification/celebration when badge unlocked
- [ ] Achievements gallery viewable in profile
- [ ] Badges show locked/unlocked state
- [ ] Share individual achievements (optional)

#### Files to Create
- `convex/achievements.ts` - Achievement logic
- `convex/seed/achievements.ts` - Seed data
- `app/(athlete)/profile/achievements.tsx` - Gallery screen
- `components/achievements/BadgeCard.tsx`
- `components/achievements/AchievementUnlock.tsx`

---

### 2.4 Kid-Friendly Phase Naming

**Priority:** 🟡 Medium
**Effort:** Small (1-2 days)
**Dependencies:** None

#### Problem Statement
"GPP", "SPP", and "SSP" are technical training terms that may be intimidating or confusing to young athletes and parents.

#### Solution Overview
Create a parallel naming system that's more approachable while maintaining the training science foundation.

#### Naming Proposal

| Technical | Kid-Friendly | Icon | Color |
|-----------|--------------|------|-------|
| GPP (General Physical Preparedness) | "Build Your Base" | 🌱 | Green |
| SPP (Sport-Specific Preparation) | "Level Up" | 🔥 | Orange |
| SSP (Sport-Specific Peaking) | "Game Time" | 🏆 | Gold |

**Alternative Options:**
- Option B: "Get Ready" → "Get Stronger" → "Get There"
- Option C: "Foundation" → "Development" → "Peak"

#### Technical Requirements

**Display Name Mapping:**
```typescript
// lib/constants/phases.ts
export const PHASE_DISPLAY_NAMES = {
  GPP: {
    technical: "GPP",
    friendly: "Build Your Base",
    icon: "🌱",
    description: "Build your athletic foundation"
  },
  SPP: {
    technical: "SPP",
    friendly: "Level Up",
    icon: "🔥",
    description: "Get sport-specific strong"
  },
  SSP: {
    technical: "SSP",
    friendly: "Game Time",
    icon: "🏆",
    description: "Peak for competition"
  }
}
```

**Settings Toggle (Optional):**
- Allow toggle between "Simple" and "Technical" naming
- Default to Simple for under-18
- Coaches/parents might prefer technical terms

#### Acceptance Criteria
- [ ] All user-facing phase names use friendly versions
- [ ] Icons consistently represent phases throughout app
- [ ] Training Science section explains both names
- [ ] Settings option to toggle naming style (optional)

#### Files to Modify
- `lib/constants/` - Add phase display names
- `app/(athlete)/index.tsx` - Update dashboard
- `app/(athlete)/program.tsx` - Update program browser
- `app/(onboarding)/` - Update onboarding screens
- `components/workout/PhaseBadge.tsx` - Update badge component

---

## Phase 3: Notifications & Parent Value

### 3.1 Push Notification System

**Priority:** 🟠 High
**Effort:** Large (1-2 weeks)
**Dependencies:** 1.1 Parent Role (for routing notifications)

#### Problem Statement
Users have no reminders to complete workouts, and parents have no visibility into child activity without opening the app.

#### Solution Overview
Implement push notifications using Expo Notifications with different notification types for athletes and parents.

#### Notification Types

**Athlete Notifications:**
| Type | Trigger | Message Example |
|------|---------|-----------------|
| Workout Reminder | Daily at preferred time | "Time to train! Today's workout is ready." |
| Streak at Risk | 24h before streak breaks | "Don't lose your 7-day streak! Complete today's workout." |
| Achievement Unlocked | On badge unlock | "You earned the Week Warrior badge!" |
| Phase Complete | On phase completion | "You completed Build Your Base! Level Up unlocked." |

**Parent Notifications:**
| Type | Trigger | Message Example |
|------|---------|-----------------|
| Child Completed Workout | On workout complete | "[Child] completed their workout today!" |
| Weekly Summary | Sunday evening | "[Child] completed 4/5 workouts this week. Great progress!" |
| Milestone Achieved | On major milestone | "[Child] hit a 30-day streak! That's dedication." |
| Inactivity Alert | 3+ days no activity | "[Child] hasn't trained in 3 days. Time for a check-in?" |

#### Technical Requirements

**Expo Notifications Setup:**
```typescript
// lib/notifications/setup.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export async function registerForPushNotifications() {
  // Request permissions
  // Get Expo push token
  // Store token in Convex
}
```

**Schema Updates:**
```typescript
// Add to users table
expoPushToken: v.optional(v.string()),
notificationPreferences: v.optional(v.object({
  workoutReminders: v.boolean(),
  streakAlerts: v.boolean(),
  achievements: v.boolean(),
  parentUpdates: v.boolean(), // For parents
  reminderTime: v.string(), // "09:00" format
}))
```

**Notification Service (`convex/notifications.ts`):**
```typescript
export const sendPushNotification = action({
  // Send via Expo Push API
})

export const scheduleWorkoutReminder = mutation({
  // Schedule daily reminder
})

export const checkStreakRisk = mutation({
  // Check if streak will break tomorrow
})
```

#### Acceptance Criteria
- [ ] Push notification permissions requested on onboarding
- [ ] Users can set preferred reminder time
- [ ] Workout reminders sent at scheduled time
- [ ] Streak-at-risk notifications work correctly
- [ ] Parents receive child activity notifications
- [ ] All notification types can be toggled on/off

#### Files to Create
- `lib/notifications/setup.ts` - Notification initialization
- `lib/notifications/handlers.ts` - Notification response handlers
- `convex/notifications.ts` - Backend notification logic
- `app/(athlete)/profile/notifications.tsx` - Preferences screen

#### Files to Modify
- `convex/schema.ts` - Add push token and preferences
- `app/_layout.tsx` - Initialize notifications
- `app/(onboarding)/` - Request permissions during onboarding

---

### 3.2 Email Notification System

**Priority:** 🟡 Medium
**Effort:** Medium (1 week)
**Dependencies:** 1.1 Parent Role, 3.1 Push Notifications

#### Problem Statement
Parents need regular updates about their child's training without having to open the app constantly.

#### Solution Overview
Implement email notifications for parents only (COPPA compliant - no emails to minors).

#### Email Types

| Email | Frequency | Content |
|-------|-----------|---------|
| Weekly Summary | Sunday | Workouts completed, streak status, upcoming week |
| Monthly Progress | 1st of month | Progress overview, achievements, 1RM changes |
| Milestone Alert | On achievement | Celebration of child's accomplishment |
| Inactivity Check-in | After 5 days | Gentle reminder that child hasn't trained |

#### Technical Requirements

**Email Service Options:**
1. **Resend** - Modern, developer-friendly
2. **SendGrid** - Established, feature-rich
3. **Convex Actions** - Can call external email API

**Email Templates:**
```
emails/
  templates/
    weekly-summary.tsx      # React Email template
    monthly-progress.tsx
    milestone-achieved.tsx
    inactivity-alert.tsx
```

**Convex Scheduled Functions:**
```typescript
// convex/crons.ts
export const weeklyEmailCron = cronJobs()
  .weekly("send weekly summaries", { day: "sunday", hour: 18 })
  .run(sendWeeklySummaries)
```

#### Acceptance Criteria
- [ ] Weekly summary emails sent to parents
- [ ] Emails only sent to parent accounts (never children)
- [ ] Unsubscribe link in all emails
- [ ] Email preferences in parent settings
- [ ] Emails are well-designed and mobile-friendly

#### Files to Create
- `emails/templates/` - Email templates
- `convex/emails.ts` - Email sending logic
- `convex/crons.ts` - Scheduled email jobs

---

### 3.3 Parent Dashboard

**Priority:** 🟠 High
**Effort:** Large (1-2 weeks)
**Dependencies:** 1.1 Parent Role

#### Problem Statement
Parents need a dedicated view to monitor their child's training progress without accessing the child's account.

#### Solution Overview
Create a parent-specific dashboard showing all linked children's progress at a glance.

#### Dashboard Components

**Child Overview Card:**
```
┌─────────────────────────────────────┐
│ [Avatar] Johnny                      │
│ ────────────────────────────────────│
│ 🔥 12-day streak                    │
│ ────────────────────────────────────│
│ This Week: ████░░░ 4/6 workouts     │
│ Phase: Level Up (Week 2)            │
│ ────────────────────────────────────│
│ Last workout: Yesterday, 45 min     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

**Detailed Child View:**
- Workout history (calendar view)
- Phase progress timeline
- Achievement badges earned
- 1RM progress charts
- Training consistency graph

#### Technical Requirements

**New Screens:**
```
app/(parent)/
  _layout.tsx           # Parent tab navigation
  index.tsx             # Dashboard with child cards
  child/[id].tsx        # Detailed child view
  settings.tsx          # Parent settings & notifications
  add-child.tsx         # Add another child
```

**New Components:**
```
components/parent/
  ChildOverviewCard.tsx
  WeeklyProgressBar.tsx
  ConsistencyCalendar.tsx
  ProgressChart.tsx
```

**Convex Queries:**
```typescript
// convex/parent.ts
export const getLinkedChildren = query({
  // Return all children linked to parent
})

export const getChildProgress = query({
  // Detailed progress for single child
})

export const getChildWorkoutHistory = query({
  // Workout history for calendar view
})
```

#### Acceptance Criteria
- [ ] Parent sees all linked children on dashboard
- [ ] Each child card shows key stats at a glance
- [ ] Can drill into detailed view per child
- [ ] Calendar view shows workout completion
- [ ] Progress charts visualize improvement
- [ ] Can add additional children

#### Files to Create
- `app/(parent)/_layout.tsx`
- `app/(parent)/index.tsx`
- `app/(parent)/child/[id].tsx`
- `components/parent/ChildOverviewCard.tsx`
- `convex/parent.ts`

---

## Phase 4: Polish & Future

### 4.1 Notification Preferences Screen

**Priority:** 🟢 Lower
**Effort:** Small (2-3 days)
**Dependencies:** 3.1 Push Notifications

#### Solution Overview
Settings screen for users to customize notification preferences.

**Settings Options:**
- Workout reminder time (time picker)
- Enable/disable workout reminders
- Enable/disable streak alerts
- Enable/disable achievement notifications
- (Parents) Enable/disable child activity notifications
- (Parents) Weekly email summary toggle

#### Files to Create
- `app/(athlete)/profile/notifications.tsx`
- `app/(parent)/settings/notifications.tsx`

---

### 4.2 Advanced Progress Analytics

**Priority:** 🟢 Lower
**Effort:** Large (2+ weeks)
**Dependencies:** Core features complete

#### Solution Overview
Detailed analytics and visualizations for progress tracking.

**Features:**
- Strength progression charts (1RM over time)
- Volume tracking graphs
- Consistency heatmaps
- Phase-over-phase comparisons
- Personal records highlights

---

### 4.3 Wearable Integration

**Priority:** 🟢 Future
**Effort:** Very Large
**Dependencies:** Core app stable

#### Notes from Advisor
"Potential to work through the workouts on wearable"

#### Considerations
- Apple Watch app for workout tracking
- Heart rate integration
- Rep counting via motion sensors
- Simplified workout view for small screen

**Recommended Approach:**
- Start with Apple Watch companion app
- Display current exercise, sets, reps
- Allow marking sets complete from watch
- Sync back to phone app

---

## Appendix

### A. COPPA Compliance Checklist

- [ ] No email collection from users under 13
- [ ] Verifiable parental consent mechanism
- [ ] Parent controls all communication preferences
- [ ] Data deletion available upon parent request
- [ ] Privacy policy clearly explains data practices
- [ ] No behavioral advertising to children
- [ ] No social features that expose child data

### B. File Structure Overview

```
app/
  (auth)/
    select-role.tsx          # NEW: Parent vs Athlete
    parent-sign-up.tsx       # NEW: Parent registration
  (parent)/                  # NEW: Parent experience
    _layout.tsx
    index.tsx
    child/[id].tsx
    add-child.tsx
    settings.tsx
  (athlete)/
    profile/
      achievements.tsx       # NEW: Badge gallery
      notifications.tsx      # NEW: Notification prefs

components/
  celebrations/              # NEW: Celebration animations
    StreakCelebration.tsx
    ConfettiEffect.tsx
    BadgeUnlock.tsx
  achievements/              # NEW: Achievement components
    BadgeCard.tsx
    AchievementUnlock.tsx
  parent/                    # NEW: Parent components
    ChildOverviewCard.tsx
    WeeklyProgressBar.tsx

convex/
  achievements.ts            # NEW: Achievement logic
  streaks.ts                 # NEW: Streak calculation
  notifications.ts           # NEW: Push notifications
  parent.ts                  # NEW: Parent queries
  emails.ts                  # NEW: Email notifications
  crons.ts                   # NEW: Scheduled jobs

lib/
  notifications/             # NEW: Notification setup
    setup.ts
    handlers.ts
  constants/
    phases.ts                # NEW: Phase display names
    achievements.ts          # NEW: Achievement definitions
```

### C. Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Parent Role & COPPA | High | Large | 🔴 Critical |
| Child Data Anonymization | High | Medium | 🔴 Critical |
| Fix Streak Calculation | High | Small | 🟠 High |
| Streak Celebrations | High | Medium | 🟠 High |
| Workout Completion Celebrations | Medium | Small | 🟠 High |
| Push Notifications | High | Large | 🟠 High |
| Parent Dashboard | High | Large | 🟠 High |
| Achievement Badges | Medium | Medium | 🟡 Medium |
| Kid-Friendly Naming | Medium | Small | 🟡 Medium |
| Email Notifications | Medium | Medium | 🟡 Medium |
| Notification Preferences | Low | Small | 🟢 Lower |
| Advanced Analytics | Medium | Large | 🟢 Lower |
| Wearable Integration | Low | Very Large | 🟢 Future |

---

*Last Updated: January 2026*
*Based on feedback from: Loukman (Technical Advisor)*
