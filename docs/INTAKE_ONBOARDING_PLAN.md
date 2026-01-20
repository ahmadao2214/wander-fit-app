# Intake + Onboarding Flow Plan

## Overview

This document outlines the plan for combining the intake questionnaire flow with onboarding education into a cohesive, interleaved experience for new athletes.

---

## Current Implementation (PR #37)

### What's Been Merged

**Intake Flow (7 screens)** - Located in `app/(intake)/`
| Screen | File | UI Metaphor | Purpose |
|--------|------|-------------|---------|
| 1 | `sport.tsx` | Sport grid with Lottie | Select sport (determines GPP category) |
| 2 | `age-group.tsx` | Division cards | Select age group (10-13, 14-17, 18+) |
| 3 | `experience-years.tsx` | Trophy Shelf | Years of training experience |
| 4 | `training-days.tsx` | Whiteboard Calendar | Days per week commitment |
| 5 | `season-timeline.tsx` | Flight Path | Weeks until season starts |
| 6 | `maxes.tsx` | Form inputs | Optional 1RM entry |
| 7 | `results.tsx` | Summary cards | Program confirmation |

**Onboarding Flow (10 screens)** - Located in `app/(onboarding)/`
| Screen | File | Purpose |
|--------|------|---------|
| 0 | `welcome.tsx` | Personalized greeting |
| 1 | `phases-overview.tsx` | GPP → SPP → SSP introduction |
| 2 | `why-it-works.tsx` | Periodization methodology |
| 3 | `gpp-detail.tsx` | GPP explanation |
| 4 | `spp-detail.tsx` | SPP explanation |
| 5 | `ssp-detail.tsx` | SSP explanation |
| 6 | `personal-timeline.tsx` | 12-week journey visualization |
| 7 | `commitment.tsx` | Hold-to-confirm interaction |
| 8 | `progression.tsx` | Unlock progression explanation |
| 9 | `first-workout.tsx` | Workout preview |

**Shared Components** - Located in `components/onboarding/`
- `OnboardingScreen.tsx` - Base wrapper with progress, skip button
- `OnboardingProgress.tsx` - Animated progress dots
- `PhaseCard.tsx` - GPP/SPP/SSP phase cards
- `TimelineView.tsx` - Visual timeline component
- `CommitmentButton.tsx` - YAZIO-style hold-to-confirm
- `OnboardingButton.tsx` - Styled action buttons

**Other**
- `components/IntakeProgressDots.tsx` - Intake progress indicator
- `hooks/useOnboardingAnalytics.ts` - Analytics tracking
- `lib/analytics.ts` - Analytics service
- Profile "Revisit Onboarding" button

---

## Planned Changes (Not Yet Implemented)

### 1. Trim Onboarding to 5 Key Screens

**Keep:**
- `why-it-works.tsx` - Methodology overview
- `phases-overview.tsx` - GPP/SPP/SSP intro
- `personal-timeline.tsx` - 12-week journey
- `commitment.tsx` - Hold-to-confirm
- `first-workout.tsx` - Workout preview

**Remove/Skip:**
- `welcome.tsx` - Merge messaging into sport selection
- `gpp-detail.tsx` - Covered in phases-overview
- `spp-detail.tsx` - Covered in phases-overview
- `ssp-detail.tsx` - Covered in phases-overview
- `progression.tsx` - Move unlock info to results

### 2. Interleaved Navigation

**Proposed Combined Flow (12 screens):**

```
1.  Sport Selection         ← Intake (determines category)
    ↓
2.  "Why This Works"        ← Onboarding (methodology)
3.  "The Three Phases"      ← Onboarding (GPP/SPP/SSP intro)
    ↓
4.  Age Group               ← Intake
5.  Experience Years        ← Intake (Trophy Shelf)
6.  Training Days           ← Intake (Whiteboard)
7.  Season Timeline         ← Intake (Flight Path)
    ↓
8.  "Your Personal Timeline"← Onboarding (12-week journey)
9.  "Commitment"            ← Onboarding (hold-to-confirm)
    ↓
10. Maxes                   ← Intake (1RM entry)
11. "First Workout Preview" ← Onboarding
12. Results                 ← Intake (program summary)
```

**Route Structure Decision:** Keep separate `/(intake)/` and `/(onboarding)/` groups, navigate between them.

### 3. Animation Plan

**Sport Animations:**
- 27 sport-specific Lottie animations (following `soccer.json` pattern)
- Incremental rollout: Soccer first, add others as generated
- AI-generated + refined

**Category Color Theming:**
Using existing design system tokens from `tamagui.config.ts`:

| Category | Color | Token |
|----------|-------|-------|
| 1 - Endurance | Teal | `$catEndurance` (#14B8A6) |
| 2 - Power | Purple | `$catPower` (#A855F7) |
| 3 - Rotation | Orange | `$catRotation` (#F97316) |
| 4 - Strength | Blue | `$catStrength` (#3B82F6) |

**Animation Placement:** Inline elements within UI (not full-screen backgrounds)

---

## Technical Details

### State Management

Onboarding state stored on user object (simpler approach):
```typescript
// convex/schema.ts - users table
onboardingCompletedAt: v.optional(v.number())  // null = needs onboarding
onboardingProgress: v.optional(v.number())     // Screen index (0-9)
onboardingSkipped: v.optional(v.boolean())     // True if skipped
```

### Key Convex Functions

```typescript
// convex/onboarding.ts
getOnboardingState()        // Get current progress
shouldShowOnboarding()      // Check if user should see onboarding
startOnboarding()           // Initialize flow
advanceOnboarding(index)    // Move to specific screen
skipOnboarding()            // Skip entire flow
completeOnboarding()        // Mark as completed
resetOnboardingForRevisit() // Reset for settings revisit
getOnboardingData()         // Get personalized data for screens
```

### Auth Hook Integration

```typescript
// hooks/useAuth.ts
needsOnboarding  // true if intake done but onboarding not done
hasCompletedOnboarding  // true if onboarding completed
```

---

## File Structure

```
app/
├── (intake)/
│   ├── _layout.tsx
│   ├── sport.tsx
│   ├── age-group.tsx
│   ├── experience-years.tsx
│   ├── training-days.tsx
│   ├── season-timeline.tsx
│   ├── maxes.tsx
│   └── results.tsx
├── (onboarding)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── welcome.tsx
│   ├── phases-overview.tsx
│   ├── why-it-works.tsx
│   ├── gpp-detail.tsx
│   ├── spp-detail.tsx
│   ├── ssp-detail.tsx
│   ├── personal-timeline.tsx
│   ├── commitment.tsx
│   ├── progression.tsx
│   └── first-workout.tsx
components/
├── IntakeProgressDots.tsx
└── onboarding/
    ├── index.ts
    ├── OnboardingScreen.tsx
    ├── OnboardingProgress.tsx
    ├── OnboardingButton.tsx
    ├── PhaseCard.tsx
    ├── TimelineView.tsx
    └── CommitmentButton.tsx
convex/
└── onboarding.ts
hooks/
├── useAuth.ts
└── useOnboardingAnalytics.ts
assets/lottie/sports/
└── soccer.json  (existing, template for others)
```

---

## Open Questions / Discussion Points

1. **Interleaving order:** Is the proposed 12-screen flow the right order? Should education come before or after certain intake questions?

2. **Screen trimming:** Are we removing the right onboarding screens? Should we keep any of the detail screens (gpp-detail, spp-detail, ssp-detail)?

3. **Progress indicator:** Should we show a unified progress bar across both flows, or keep them separate?

4. **Skip behavior:** Can users skip individual screens, or only the entire onboarding flow?

5. **Animation priority:** Which sport Lotties should be created first beyond soccer?

6. **Revisit flow:** When revisiting from settings, should users see the full onboarding or just key screens?

---

## Next Steps

- [ ] Review this plan and provide feedback
- [ ] Implement screen trimming
- [ ] Implement interleaved navigation
- [ ] Update progress indicators
- [ ] Create additional sport Lottie animations
- [ ] Test full flow end-to-end
