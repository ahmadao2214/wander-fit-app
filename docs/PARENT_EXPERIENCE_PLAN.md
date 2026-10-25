# Parent Experience Plan

> Comprehensive plan for parent features, comparing PR #30 implementation with advisor recommendations

## Executive Summary

PR #30 has implemented the **core parent infrastructure**. This document identifies what's complete, what gaps remain, and what additional features align with Loukman's advisor feedback about making parents the primary gatekeepers.

---

## PR #30 Implementation Status

### What's Already Built

| Feature | Status | Files |
|---------|--------|-------|
| **Parent Role in Schema** | ✅ Complete | `convex/schema.ts` |
| **Parent-Athlete Relationships** | ✅ Complete | `convex/parentRelationships.ts` |
| **Parent Tab Navigation** | ✅ Complete | `app/(parent)/_layout.tsx` |
| **Parent Dashboard** | ✅ Complete | `app/(parent)/index.tsx` |
| **Add Athlete (Invitation Flow)** | ✅ Complete | `app/(parent)/add-athlete.tsx` |
| **Athlete Detail View** | ✅ Complete | `app/(parent)/athletes/[id].tsx` |
| **Athlete Program View** | ✅ Complete | `app/(parent)/athletes/[id]/program.tsx` |
| **Family Calendar** | ✅ Complete | `components/parent/FamilyCalendar.tsx` |
| **Parent Workout Control** | ✅ Complete | `convex/scheduleOverrides.ts` |
| **Athlete Accept Invite** | ✅ Complete | `app/(athlete)/accept-invite.tsx` |
| **Auth Guards** | ✅ Complete | `components/AuthGuard.tsx` |

### PR #30 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARENT EXPERIENCE (PR #30)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  Athletes   │    │  Calendar   │    │   Profile   │        │
│  │    Tab      │    │    Tab      │    │    Tab      │        │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘        │
│         │                  │                                   │
│         ▼                  ▼                                   │
│  ┌─────────────┐    ┌─────────────┐                           │
│  │  Athlete    │    │   Family    │                           │
│  │   Cards     │    │  Calendar   │                           │
│  └──────┬──────┘    └─────────────┘                           │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────┐                          │
│  │     Athlete Detail View         │                          │
│  │  - Profile info                 │                          │
│  │  - Program progress             │                          │
│  │  - Sports list                  │                          │
│  └──────┬──────────────────────────┘                          │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────┐                          │
│  │     Athlete Program View        │                          │
│  │  - Week schedule                │                          │
│  │  - Swap workouts                │                          │
│  │  - Set today's focus            │                          │
│  │  - Reset phase                  │                          │
│  └─────────────────────────────────┘                          │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Linking Flow (Implemented)

```
Parent                              Athlete
  │                                    │
  ├─► Creates invite code              │
  │   (6-character, 7-day expiry)      │
  │                                    │
  │   ────────────────────────────►    │
  │         Shares code                │
  │                                    │
  │                                    ├─► Enters code in app
  │                                    │   (Profile → Link Parent)
  │                                    │
  │   ◄────────────────────────────    │
  │         Link confirmed             │
  │                                    │
  ├─► Can now view/manage athlete      │
  │                                    │
```

---

## Gap Analysis: What's Missing

Based on Loukman's advisor feedback, the following gaps exist:

### Gap 1: COPPA Compliance (Critical)

**Advisor Note:** "Anonymous email for children and not taking any data for kids - COPPA compliant. Only ask for email for parents. No data from kids."

**Current State (PR #30):**
- Athletes still sign up with email (via Clerk)
- No age-based data handling
- Children under 13 create accounts same as adults

**Required Changes:**

| Change | Priority | Effort |
|--------|----------|--------|
| Age gate at sign-up | 🔴 Critical | Small |
| Under-13 flow: parent creates child profile | 🔴 Critical | Medium |
| No email collection for minors | 🔴 Critical | Medium |
| Anonymized child IDs | 🔴 Critical | Medium |
| Parental consent mechanism | 🔴 Critical | Medium |

**Technical Approach:**
```typescript
// Sign-up flow modification
if (ageGroup === "10-13") {
  // Redirect to "Ask Parent to Create Account"
  // Parent creates child profile without child's email
  // Child accesses via device-based auth or PIN
}
```

### Gap 2: Parent Notifications

**Advisor Note:** "Notification reminders is very helpful. Email notifications."

**Current State (PR #30):**
- No notification system
- Parents must open app to check progress

**Required Features:**

| Notification Type | Trigger | Recipient |
|-------------------|---------|-----------|
| Workout completed | Child finishes workout | Parent |
| Streak milestone | Child hits 7, 14, 30 days | Parent |
| Weekly summary | Sunday evening | Parent |
| Inactivity alert | 3+ days no workout | Parent |
| Streak at risk | 24h before break | Parent |

### Gap 3: Parent-Created Child Accounts

**Advisor Note:** "Parent experience will have most value"

**Current State (PR #30):**
- Parent links to *existing* athlete account
- Athlete must create account first

**Proposed Enhancement:**
- Parent can create child's account directly
- Child gets a PIN or device-based access (no email/password)
- Parent has full control from day one

**New Flow:**
```
Parent Sign Up → Add Child (create new) → Child Intake → Done
                      │
                      └─► OR Link Existing (current PR #30 flow)
```

---

## Implementation Plan

### Phase 1: Merge PR #30 (Foundation)

**Status:** Ready for review/merge

PR #30 provides the essential infrastructure:
- [x] Parent role and schema
- [x] Invitation-based linking
- [x] Parent dashboard
- [x] Workout viewing and control
- [x] Family calendar

**Action:** Review and merge PR #30

---

### Phase 2: COPPA Compliance

**Priority:** 🔴 Critical (legal requirement)
**Effort:** 1-2 weeks
**Dependencies:** PR #30 merged

#### 2.1 Age Gate at Sign-Up

**Files to Modify:**
- `app/(auth)/sign-up.tsx` - Add age question before account creation

**Logic:**
```typescript
// Step 1: Ask age group first
if (selectedAgeGroup === "10-13") {
  // Show: "Athletes under 13 need a parent to set up their account"
  // Button: "I'm a Parent - Set Up My Child"
  // Link to parent sign-up flow
} else if (selectedAgeGroup === "14-17") {
  // Show: "We recommend having a parent create your account"
  // Option to continue anyway OR have parent create
} else {
  // Normal adult sign-up flow
}
```

**Acceptance Criteria:**
- [ ] Age question appears before email input
- [ ] Under-13 users cannot create accounts directly
- [ ] Clear messaging directs parents to create account
- [ ] 14-17 users get recommendation but can proceed

#### 2.2 Parent Creates Child Account

**New Screen:** `app/(parent)/create-child.tsx`

**Files to Create:**
- `app/(parent)/create-child.tsx` - Child account creation form
- `convex/childAccounts.ts` - Mutations for parent-created children

**Child Account Data (Minimal):**
```typescript
{
  displayName: string,      // Not legal name
  ageGroup: "10-13" | "14-17",
  parentId: Id<"users">,    // Required for minors
  // NO email, NO password, NO birthdate
}
```

**Acceptance Criteria:**
- [ ] Parent can create child account from dashboard
- [ ] Child account has no PII (no email)
- [ ] Child is automatically linked to parent
- [ ] Child profile shows "Managed by [Parent Name]"

#### 2.3 Child Access Method

**Options (choose one):**

| Method | Pros | Cons |
|--------|------|------|
| **Device-based** | Simplest UX | Can't switch devices easily |
| **4-digit PIN** | Easy for kids | Weak security |
| **Parent unlock** | Most secure | Friction for child |
| **QR code from parent** | Good balance | Requires both devices |

**Recommendation:** Device-based with parent "Transfer to New Device" option

**Files to Create:**
- `app/(auth)/child-access.tsx` - Child login screen
- `lib/childAuth.ts` - Device-based auth helpers

#### 2.4 Data Anonymization

**Schema Changes:**
```typescript
// convex/schema.ts
users: defineTable({
  // ... existing fields
  isMinor: v.boolean(),
  email: v.optional(v.string()), // Optional for minors
  anonymousId: v.optional(v.string()), // For analytics without PII
})
```

**Privacy Policy Requirements:**
- Document what data is collected from minors (minimal)
- Explain parent control over child data
- Provide data deletion process for parents

---

### Phase 3: Parent Notifications

**Priority:** 🟠 High
**Effort:** 1-2 weeks
**Dependencies:** Phase 2 complete

#### 3.1 Push Notification Infrastructure

**Files to Create:**
- `lib/notifications/setup.ts` - Expo push notification setup
- `lib/notifications/handlers.ts` - Notification response handlers
- `convex/notifications.ts` - Backend notification logic

**Schema Addition:**
```typescript
// convex/schema.ts
users: defineTable({
  // ... existing fields
  expoPushToken: v.optional(v.string()),
  notificationPreferences: v.optional(v.object({
    childWorkoutComplete: v.boolean(),
    childStreakMilestones: v.boolean(),
    childInactivityAlerts: v.boolean(),
    weeklySummary: v.boolean(),
  })),
})
```

#### 3.2 Email Notification System

**Service:** Resend or SendGrid

**Files to Create:**
- `convex/emails.ts` - Email sending actions
- `convex/crons.ts` - Scheduled email jobs
- `emails/templates/weekly-summary.tsx` - React Email template

**Email Schedule:**
| Email | When | Contains |
|-------|------|----------|
| Weekly Summary | Sunday 6pm | Workouts completed, streak status, upcoming week |
| Milestone Alert | On achievement | Celebration message, badge earned |
| Inactivity Alert | After 5 days | Gentle reminder, tips to re-engage |

#### 3.3 Notification Preferences Screen

**New Screen:** `app/(parent)/settings/notifications.tsx`

**Controls:**
- [ ] Child completed workout (push)
- [ ] Streak milestones (push)
- [ ] Inactivity alerts (push + email)
- [ ] Weekly summary (email)
- [ ] Reminder time preference

---

### Phase 4: Enhanced Parent Controls (Future)

These are nice-to-have features for future iterations:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-child management** | Bulk actions across children | Low |
| **Training notes** | Parent adds notes for coach/child | Low |
| **Progress reports** | Exportable PDF summaries | Low |
| **Reward system** | Parent sets goals/rewards | Medium |
| **Communication** | In-app messaging with coach | Low |

---

## File Structure After Implementation

```
app/
  (auth)/
    sign-up.tsx              # MODIFY: Add age gate
    child-access.tsx         # NEW: Child login (no email)
  (parent)/
    _layout.tsx              # ✅ EXISTS (PR #30)
    index.tsx                # ✅ EXISTS (PR #30)
    add-athlete.tsx          # ✅ EXISTS (PR #30)
    create-child.tsx         # NEW: Parent creates child
    athletes/
      [id].tsx               # ✅ EXISTS (PR #30)
      [id]/program.tsx       # ✅ EXISTS (PR #30)
    settings/
      notifications.tsx      # NEW: Notification prefs
    profile.tsx              # ✅ EXISTS (PR #30)
    calendar.tsx             # ✅ EXISTS (PR #30)

components/
  parent/
    AthleteCard.tsx          # ✅ EXISTS (PR #30)
    FamilyCalendar.tsx       # ✅ EXISTS (PR #30)
    ChildCreationForm.tsx    # NEW: Create child account
    NotificationSettings.tsx # NEW: Notification toggles

convex/
  parentRelationships.ts     # ✅ EXISTS (PR #30)
  parentInvitations.ts       # ✅ EXISTS (PR #30)
  scheduleOverrides.ts       # ✅ EXISTS (PR #30)
  childAccounts.ts           # NEW: Parent-created children
  notifications.ts           # NEW: Push notification logic
  emails.ts                  # NEW: Email actions
  crons.ts                   # NEW: Scheduled jobs

lib/
  childAuth.ts               # NEW: Device-based auth
  notifications/
    setup.ts                 # NEW: Expo notifications
    handlers.ts              # NEW: Response handlers

emails/
  templates/
    weekly-summary.tsx       # NEW: Weekly email template
    milestone-alert.tsx      # NEW: Achievement email
    inactivity-alert.tsx     # NEW: Re-engagement email
```

---

## Priority Summary

| Item | Phase | Priority | Effort | Status |
|------|-------|----------|--------|--------|
| Parent role & dashboard | - | - | - | ✅ PR #30 |
| Invitation linking flow | - | - | - | ✅ PR #30 |
| Family calendar | - | - | - | ✅ PR #30 |
| Parent workout control | - | - | - | ✅ PR #30 |
| **Age gate at sign-up** | 2 | 🔴 Critical | Small | ⬜ TODO |
| **Parent creates child** | 2 | 🔴 Critical | Medium | ⬜ TODO |
| **Child access (no email)** | 2 | 🔴 Critical | Medium | ⬜ TODO |
| **Data anonymization** | 2 | 🔴 Critical | Small | ⬜ TODO |
| Push notifications | 3 | 🟠 High | Medium | ⬜ TODO |
| Email notifications | 3 | 🟠 High | Medium | ⬜ TODO |
| Notification preferences | 3 | 🟡 Medium | Small | ⬜ TODO |

---

## Testing Requirements

### Unit Tests

```typescript
// convex/__tests__/childAccounts.test.ts
describe('childAccounts', () => {
  it('creates child without email', () => {})
  it('links child to parent automatically', () => {})
  it('prevents under-13 from creating own account', () => {})
})

// convex/__tests__/notifications.test.ts
describe('parent notifications', () => {
  it('sends notification when child completes workout', () => {})
  it('respects notification preferences', () => {})
})
```

### Manual Testing Checklist

- [ ] Under-13 user cannot sign up directly
- [ ] Parent can create child account
- [ ] Child can access app without email
- [ ] Parent receives push notification on child workout
- [ ] Parent receives weekly summary email
- [ ] Notification preferences are respected

---

## Open Questions

1. **Device transfer:** How does a child access their account on a new device?
   - Option A: Parent generates new access code
   - Option B: Parent "transfers" account in settings

2. **Age verification:** How do we verify a user claiming to be 18+?
   - Current: Honor system
   - Future: Could require parent link for 14-17

3. **Multiple parents:** Can a child have multiple linked parents?
   - Recommendation: Yes, support 2 parents/guardians

4. **Coach integration:** How does parent role interact with future coach role?
   - Parent: Views progress, manages schedule
   - Coach: Assigns workouts, provides feedback
   - Both can view, only coach can modify program

---

*Last Updated: January 2026*
*Related: PR #30, PRODUCT_ROADMAP.md*
