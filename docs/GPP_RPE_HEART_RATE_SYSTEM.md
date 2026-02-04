# GPP RPE + Heart Rate Zone System

## Overview

This document outlines a Rating of Perceived Exertion (RPE) system for General Physical Preparedness (GPP) work capacity and conditioning exercises. The system is designed for exercises like sled push/pull, loaded carries, circuit training, and general conditioning work.

The system integrates heart rate zones with RPE to help users exercise at the correct intensity for their sport, age, and experience level.

---

## Current State

Our app already has:
- **RPE capture** (1-10 scale per set in `SetEditSheet.tsx`)
- **Intensity levels** (Low/Moderate/High) with RPE targets: 5-6, 6-7, 8-9
- **Age-based caps** (10-13 capped at Moderate, 14-17 and 18+ can do High)
- **4 sport categories** (Endurance, Power, Rotational, Strength)
- **Phase progression** (GPP → SPP → SSP)

### The Gap

The current system is optimized for **strength training** (sets/reps/%1RM). GPP conditioning exercises need a different approach since they:
- Are typically time-based or distance-based
- Target cardiovascular adaptations, not maximal strength
- Require heart rate zone awareness for sport-specific energy system development

---

## Heart Rate Zone Framework

### 5-Zone Model

| Zone | % Max HR | RPE | Intensity | Description | Use Case |
|------|----------|-----|-----------|-------------|----------|
| **Z1** | 50-60% | 2-3 | Recovery | Light, conversational | Active recovery, warm-up |
| **Z2** | 60-70% | 4-5 | Low | Comfortable, sustainable | Aerobic base, long carries |
| **Z3** | 70-80% | 6-7 | Moderate | Challenging but manageable | Tempo work, circuits |
| **Z4** | 80-90% | 8-9 | High | Hard, can speak in phrases | Threshold training, sled intervals |
| **Z5** | 90-100% | 10 | Max | All-out, cannot speak | Sport-specific peaks (limited use) |

### Age-Based Max Heart Rate Calculation

Using the **Tanaka formula** (more accurate than 220-age):

```
Max HR = 208 - (0.7 × age)
```

#### Age Group Estimates

| Age Group | Typical Age | Est. Max HR | Zone 2 (60-70%) | Zone 3 (70-80%) | Zone 4 (80-90%) |
|-----------|-------------|-------------|-----------------|-----------------|-----------------|
| 10-13 | 12 | 200 bpm | 120-140 | 140-160 | 160-180 |
| 14-17 | 16 | 197 bpm | 118-138 | 138-158 | 158-177 |
| 18+ | 25 | 191 bpm | 115-134 | 134-153 | 153-172 |

---

## Sport Category Mapping

Different sports have different energy system demands. Each category maps to primary HR zones:

| Category | Sports | Primary Energy System | GPP Focus Zones |
|----------|--------|----------------------|-----------------|
| **1: Endurance** | Soccer, Hockey, Lacrosse | Aerobic + Repeated Sprint | Z2-Z3 base, Z4 intervals |
| **2: Power** | Basketball, Volleyball | Alactic + Lactic | Z3-Z4 work, Z5 bursts |
| **3: Rotational** | Baseball, Tennis, Golf | Alactic power, recovery | Z2 base, Z4-Z5 short bursts |
| **4: Strength** | Wrestling, Football | Lactic + Strength-Endurance | Z3-Z4 sustained, Z5 peaks |

---

## Experience-Based Progression

| Experience | Zone Access | Rationale |
|------------|-------------|-----------|
| **Novice** (0-1 yr) | Z1-Z3 only | Build aerobic base, learn pacing |
| **Moderate** (2-5 yr) | Z1-Z4 | Add threshold training |
| **Advanced** (6+ yr) | Z1-Z5 | Full spectrum access |

---

## Safety Matrix: Age + Experience

Combine age and experience for zone caps:

```
              Novice    Moderate   Advanced
10-13:        Z3 max    Z3 max     Z4 max (limited)
14-17:        Z3 max    Z4 max     Z4 max
18+:          Z4 max    Z5 max     Z5 max
```

---

## User-Facing System: Traffic Light Model

A simple color-coded system users can understand at a glance:

| Color | Zone | RPE | Talk Test | How It Feels |
|-------|------|-----|-----------|--------------|
| **Green** | Z1-Z2 | 2-5 | Full conversation | "I could do this for hours" |
| **Yellow** | Z3 | 6-7 | Short sentences | "Challenging but controlled" |
| **Orange** | Z4 | 8-9 | Few words | "Pushing hard, want to stop soon" |
| **Red** | Z5 | 10 | Can't talk | "All-out, can't maintain" |

---

## Exercise-Specific Guidelines

Target zones and work:rest ratios for GPP conditioning exercises:

| Exercise Type | Typical Zone | Work:Rest | Notes |
|---------------|--------------|-----------|-------|
| **Sled Push/Pull** | Z3-Z4 | 1:2 to 1:3 | Heavy = lower zone, lighter = higher |
| **Loaded Carries** | Z2-Z3 | Continuous | Distance-based, moderate intensity |
| **Circuit Training** | Z3-Z4 | 1:1 to 2:1 | Elevated throughout |
| **EMOM/AMRAP** | Z3-Z5 | Built-in | Pacing critical |
| **Conditioning Finishers** | Z4-Z5 | 1:3 to 1:4 | Short bursts, full recovery |

---

## Implementation Proposal

### Schema Additions

#### User Profile Extension

```typescript
// Optional: User can input resting HR for more accurate zones
restingHeartRate?: number  // For Karvonen formula (more personalized)

// For GPP conditioning tracking
gpp_conditioning_config: {
  maxHeartRate: number      // Calculated or user-provided
  primaryZone: 2 | 3 | 4    // Based on sport category
  zoneCapByAge: 3 | 4 | 5   // Safety limit
}
```

#### Conditioning Exercise Schema Extension

```typescript
// New fields for conditioning exercises
conditioningType?: "sled" | "carry" | "circuit" | "interval" | "continuous"
targetHeartRateZone?: 1 | 2 | 3 | 4 | 5
workDurationSeconds?: number
restDurationSeconds?: number
workToRestRatio?: string  // e.g., "1:2"
```

### UI Components

1. **Zone Indicator Ring** - Visual showing target zone during execution
2. **RPE-to-Zone Correlation Card** - "Your RPE of 7 suggests you're in Zone 3 (70-80% max HR)"
3. **Talk Test Prompt** - Quick check: "Can you speak in full sentences?"
4. **Post-Set Zone Check** - "How did that feel?" → Maps to zone retroactively

---

## Open Questions for Discussion

### 1. Heart Rate Input Method

How will users provide heart rate data?
- [ ] Manual input from watch/chest strap
- [ ] RPE/talk test only (no actual HR data)
- [ ] HealthKit/Google Fit integration
- [ ] All of the above (optional HR, RPE always captured)

### 2. Conditioning Exercise Structure

How should conditioning exercises be organized?
- [ ] Separate "conditioning" sections in existing templates
- [ ] Standalone conditioning workout templates
- [ ] Both options

### 3. Zone Targets Display

What should users see during workouts?
- [ ] Specific BPM ranges (e.g., "Target: 140-160 bpm")
- [ ] Color/zone only (e.g., "Yellow Zone")
- [ ] RPE-only with educational content about HR correlation

### 4. Additional Intake Questions

Should we add to the intake questionnaire?
- [ ] Resting heart rate
- [ ] Known max heart rate (if tested)
- [ ] Fitness level self-assessment
- [ ] None - calculate everything from age

---

## Related Files

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Intensity System | `/convex/intensityScaling.ts` | Core intensity logic |
| Set Editing | `/components/workout/SetEditSheet.tsx` | RPE capture (1-10 slider) |
| Schema | `/convex/schema.ts` | All data models |
| Session Tracking | `/convex/gppWorkoutSessions.ts` | Workout performance storage |

---

## Next Steps

1. Review and discuss open questions with team
2. Finalize schema changes
3. Implement heart rate zone calculation utilities
4. Update conditioning exercise templates with zone targets
5. Build UI components for zone display
6. Add educational content for users
