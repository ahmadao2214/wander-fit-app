# Kid-Friendly Phase Naming Plan

> Making training phases approachable and exciting

## Overview

**Problem:** "GPP", "SPP", and "SSP" are technical training terms that may confuse or intimidate young athletes and parents.

**Goal:** Create a parallel naming system that's approachable while maintaining the training science foundation.

**Current State:** App uses technical terms throughout (GPP, SPP, SSP).

---

## Naming Options

### Option A: Action-Based (Recommended)

| Technical | Kid-Friendly | Icon | Tagline |
|-----------|--------------|------|---------|
| GPP | "Build Your Base" | 🌱 | Build your athletic foundation |
| SPP | "Level Up" | 🔥 | Get sport-specific strong |
| SSP | "Game Time" | 🏆 | Peak for competition |

**Why This Works:**
- Active, energizing language
- Clear progression narrative
- Icons reinforce meaning
- Works across all sports

### Option B: Journey-Based

| Technical | Kid-Friendly | Icon |
|-----------|--------------|------|
| GPP | "Get Ready" | 🏃 |
| SPP | "Get Stronger" | 💪 |
| SSP | "Get There" | 🎯 |

**Pros:** Simple, memorable pattern
**Cons:** "Get There" is vague

### Option C: Gaming-Inspired

| Technical | Kid-Friendly | Icon |
|-----------|--------------|------|
| GPP | "Training Camp" | 🏕️ |
| SPP | "Skill Tree" | 🌲 |
| SSP | "Boss Level" | 👑 |

**Pros:** Appeals to gamers
**Cons:** May feel too casual for serious athletes

### Option D: Sports-Inspired

| Technical | Kid-Friendly | Icon |
|-----------|--------------|------|
| GPP | "Preseason" | 📋 |
| SPP | "Training" | 🏋️ |
| SSP | "Game Week" | 🏟️ |

**Pros:** Familiar sports language
**Cons:** May vary by sport

---

## Recommendation

**Go with Option A: "Build Your Base" → "Level Up" → "Game Time"**

Reasons:
1. Clear progression story
2. Action-oriented language
3. Universal across sports
4. Works for all ages (10-17)
5. Icons are intuitive

---

## Implementation

### Display Name Mapping

```typescript
// lib/constants/phases.ts

export const PHASE_DISPLAY = {
  GPP: {
    technical: "GPP",
    friendly: "Build Your Base",
    icon: "🌱",
    tagline: "Build your athletic foundation",
    description: "Focus on overall fitness, movement quality, and work capacity. This phase prepares your body for sport-specific training.",
    color: "$green9",  // Tamagui color token
  },
  SPP: {
    technical: "SPP",
    friendly: "Level Up",
    icon: "🔥",
    tagline: "Get sport-specific strong",
    description: "Movements that transfer directly to your sport. Bridge general fitness to competition readiness.",
    color: "$orange9",
  },
  SSP: {
    technical: "SSP",
    friendly: "Game Time",
    icon: "🏆",
    tagline: "Peak for competition",
    description: "Final preparation phase. Maintain fitness while reducing volume for freshness when it matters most.",
    color: "$yellow9",
  },
} as const

export type Phase = keyof typeof PHASE_DISPLAY

// Helper function
export function getPhaseDisplay(phase: Phase, useFriendlyNames = true) {
  const display = PHASE_DISPLAY[phase]
  return {
    name: useFriendlyNames ? display.friendly : display.technical,
    icon: display.icon,
    tagline: display.tagline,
    description: display.description,
    color: display.color,
  }
}
```

### Usage in Components

```tsx
// Before
<Text>GPP Phase - Week 2</Text>

// After
import { getPhaseDisplay } from '@/lib/constants/phases'

const phase = getPhaseDisplay('GPP')
<XStack gap="$2" alignItems="center">
  <Text>{phase.icon}</Text>
  <Text>{phase.name}</Text>
  <Text color="$color10">Week 2</Text>
</XStack>

// Renders: 🌱 Build Your Base Week 2
```

### Settings Toggle (Optional)

Allow users to switch between friendly and technical names:

```tsx
// In settings/preferences
const [useFriendlyNames, setUseFriendlyNames] = useState(true)

<XStack justifyContent="space-between" alignItems="center">
  <YStack>
    <Text fontWeight="600">Phase Names</Text>
    <Text color="$color10" fontSize={12}>
      Use kid-friendly names or technical terms
    </Text>
  </YStack>
  <Switch
    checked={useFriendlyNames}
    onCheckedChange={setUseFriendlyNames}
  />
</XStack>
<Text color="$color10" fontSize={12}>
  {useFriendlyNames ? "🌱 Build Your Base" : "GPP"}
</Text>
```

**Default:** Friendly names ON for users under 18, technical for 18+

---

## Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `lib/constants/phases.ts` | Phase display definitions |

### Files to Update

| File | Changes |
|------|---------|
| `app/(athlete)/index.tsx` | Dashboard phase badge |
| `app/(athlete)/program.tsx` | Program browser header |
| `app/(athlete)/workout/[id].tsx` | Workout detail header |
| `app/(athlete)/workout/execute/[id].tsx` | Execution screen |
| `components/workout/PhaseBadge.tsx` | Badge component |
| `app/(onboarding)/phases-overview.tsx` | Onboarding explanation |
| `app/(onboarding)/gpp-phase.tsx` | GPP detail screen |
| `app/(onboarding)/spp-phase.tsx` | SPP detail screen |
| `app/(onboarding)/ssp-phase.tsx` | SSP detail screen |
| `app/(athlete)/profile/training-science.tsx` | Education section |

---

## UI Updates

### Dashboard Phase Badge

**Before:**
```
┌─────────────────┐
│ GPP W2 D3       │
└─────────────────┘
```

**After:**
```
┌─────────────────────────────┐
│ 🌱 Build Your Base          │
│    Week 2 • Day 3           │
└─────────────────────────────┘
```

### Program Browser Header

**Before:**
```
GPP Phase
Week 1-4
```

**After:**
```
🌱 Build Your Base
"Build your athletic foundation"
Weeks 1-4
```

### Phase Progress Indicator

```
┌─────────────────────────────────────────────┐
│                YOUR JOURNEY                  │
├─────────────────────────────────────────────┤
│                                             │
│  🌱 ──────────── 🔥 ──────────── 🏆        │
│  Build Your      Level Up       Game Time   │
│  Base                                       │
│  [████████░░]   [░░░░░░░░░░]   [░░░░░░░░░░] │
│   Week 2/4       Locked         Locked      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Onboarding Updates

### Phases Overview Screen

**Before:** Technical explanation with GPP/SPP/SSP terms

**After:**
```
YOUR 12-WEEK JOURNEY

🌱 Build Your Base (Weeks 1-4)
   Build your athletic foundation. Focus on
   movement quality and overall fitness.

🔥 Level Up (Weeks 5-8)
   Get sport-specific strong. Train movements
   that transfer to your sport.

🏆 Game Time (Weeks 9-12)
   Peak for competition. Stay sharp and fresh
   when it matters most.

[Technical terms: GPP → SPP → SSP]
```

### Training Science Section

Keep technical explanations available for those who want to learn:

```
WHAT DO THE TERMS MEAN?

GPP = General Physical Preparedness
"Build Your Base" focuses on GPP—the foundation
every elite athlete builds first.

SPP = Sport-Specific Preparation
"Level Up" focuses on SPP—movements designed
for your specific sport.

SSP = Sport-Specific Peaking
"Game Time" focuses on SSP—peaking at the
right time for competition.
```

---

## Acceptance Criteria

- [ ] All user-facing phase references use friendly names by default
- [ ] Icons display consistently next to phase names
- [ ] Taglines appear where space allows
- [ ] Technical names available in Training Science section
- [ ] Optional toggle for technical names (settings)
- [ ] Onboarding explains both naming systems
- [ ] Colors consistent across all phase displays
- [ ] No regression in existing functionality

---

## Testing Requirements

### Unit Tests

```typescript
// lib/__tests__/phases.test.ts

describe('getPhaseDisplay', () => {
  it('returns friendly name by default', () => {
    const result = getPhaseDisplay('GPP')
    expect(result.name).toBe('Build Your Base')
  })

  it('returns technical name when specified', () => {
    const result = getPhaseDisplay('GPP', false)
    expect(result.name).toBe('GPP')
  })

  it('returns correct icon for each phase', () => {
    expect(getPhaseDisplay('GPP').icon).toBe('🌱')
    expect(getPhaseDisplay('SPP').icon).toBe('🔥')
    expect(getPhaseDisplay('SSP').icon).toBe('🏆')
  })
})
```

### Manual Testing

- [ ] Check all screens where phase is displayed
- [ ] Verify onboarding screens updated
- [ ] Test settings toggle (if implemented)
- [ ] Verify no hardcoded "GPP/SPP/SSP" remaining

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Create phases.ts constants | 1 hour |
| Update dashboard | 1-2 hours |
| Update program browser | 1-2 hours |
| Update workout screens | 1-2 hours |
| Update PhaseBadge component | 1 hour |
| Update onboarding screens | 2-3 hours |
| Update training science | 1-2 hours |
| Add settings toggle (optional) | 1-2 hours |
| Testing | 2-3 hours |
| **Total** | **1-2 days** |

---

## Rollout Plan

1. **Create constants file** - Central source of truth
2. **Update PhaseBadge component** - Used everywhere
3. **Update high-visibility screens** - Dashboard, program
4. **Update onboarding** - New user experience
5. **Update remaining screens** - Workout detail, execution
6. **Add settings toggle** - Optional, can be later

---

## Open Questions

- [ ] Should 18+ users default to technical or friendly names?
- [ ] Should parents see technical or friendly names?
- [ ] Do coaches/trainers want technical names?
- [ ] Should we A/B test which naming resonates better?

---

## Related Documents

- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Overall priorities
- [FUN_FACTOR_PLAN.md](./FUN_FACTOR_PLAN.md) - Making app approachable

---

*Status: Planning*
*Effort: 1-2 days*
*Priority: 🟡 Medium*
