# Training Age Intake Plan

## Background

Our current intake process asks users how long they have been playing their sport. While useful for sport-specific context, this does not reliably indicate how experienced a user is with **periodized resistance training**. Two athletes with the same number of years in a sport can have vastly different training backgrounds in the weight room.

This matters because programming complexity should scale with training age:

- **Younger training age** → benefits from simpler programming, fewer exercise variations, longer linear progression cycles, and more focus on movement quality.
- **Greater training age** → requires more detailed and complex programming (varied intensities, advanced periodization, accessory work, deload strategies) to continue driving adaptation.

By capturing training age explicitly, we can better tailor program design to each user from day one.

## Goal

Add a new intake question that captures the user's **training age** — defined as the number of years they have consistently followed a structured resistance-training program — and use that signal to inform program complexity.

## Proposed Intake Question

**Question label:**
> How long have you been consistently following a structured strength training program?

**Helper / description text (shown below the question):**
> "Training age" is different from how long you've played your sport. It refers to the number of years you've been regularly performing planned resistance training (e.g., following a lifting program with sets, reps, and progression — not just casual gym visits or sport practice). Be honest — this helps us match the complexity of your program to your experience.

**Answer options (single-select):**

| Value | Label | Description |
|-------|-------|-------------|
| `none` | I'm new to structured strength training | Less than 6 months of consistent lifting, or only occasional gym sessions. |
| `beginner` | Beginner (6 months – 1 year) | I've followed a basic lifting program for under a year. |
| `novice` | Novice (1 – 2 years) | I've trained consistently for 1–2 years and know the main lifts. |
| `intermediate` | Intermediate (2 – 4 years) | I've followed periodized programs and progressed through plateaus. |
| `advanced` | Advanced (4+ years) | I've trained consistently for years and have experience with varied periodization. |

> Note: exact buckets and thresholds are open for discussion — the goal is to give the program-generation logic enough granularity to scale complexity without overwhelming the user with too many options.

## Why a Bucketed Scale (vs. Free Text or Years Slider)

- **Self-perception matters.** Years alone don't capture consistency or program quality. The descriptions help users self-place accurately.
- **Discrete buckets** map cleanly to programming decisions (exercise pool, set/rep schemes, periodization model).
- **Lower friction** than a numeric input during onboarding.

## How This Signal Will Be Used

Training age will be a primary input into program selection alongside existing intake answers (goals, sport, equipment, etc.). Initial proposed mapping:

| Training Age | Programming Implications |
|--------------|--------------------------|
| `none` / `beginner` | Linear progression, narrower exercise pool, emphasis on the main barbell lifts and movement quality. Longer time at each load before progression. |
| `novice` | Linear progression with introduction of accessory variation. Begin exposing user to RPE/RIR concepts. |
| `intermediate` | Daily/weekly undulating periodization, broader exercise pool, structured deloads. |
| `advanced` | Block periodization (GPP / SPP / SSP phases), wider exercise variation, autoregulation, more nuanced volume/intensity management. |

Exact mapping logic will be defined during implementation and can be iterated on as we observe user outcomes.

## Open Questions for Discussion

1. **Bucket count and labels** — are 5 options the right granularity, or should we collapse to 3 (beginner / intermediate / advanced)?
2. **Should we keep the existing "years in sport" question?** Recommendation: yes — they answer different questions and both are useful signals.
3. **Where in the intake flow does this live?** Likely alongside the other training-history questions, after goals but before equipment.
4. **Do we re-ask this over time?** Training age increases with use of the app — should we auto-increment, prompt re-evaluation periodically, or leave it static?
5. **Migration for existing users** — do we backfill a default, or prompt existing users to answer on next app open?

## Proposed Implementation Phases

This document is scoped to the **plan only**. Implementation will be tracked in follow-up PRs once we align on the questions above.

1. **Phase 1 — Schema & Intake UI**
   - Add `trainingAge` field to user/profile schema in Convex.
   - Add the new question to the intake flow with the copy above.
   - Persist the answer; no programming logic changes yet.

2. **Phase 2 — Programming Logic**
   - Wire `trainingAge` into program-generation logic (exercise pool selection, periodization model, progression cadence).
   - Update existing template selection where applicable.

3. **Phase 3 — Existing User Migration**
   - Decide on backfill strategy (default vs. prompt).
   - Add re-prompt UI if needed.

4. **Phase 4 — Iteration**
   - Review aggregate distribution of answers.
   - Adjust buckets or programming mappings based on user outcomes.

## Out of Scope (For This Plan)

- Concrete code changes — this PR is documentation only.
- Final UI design / visual mocks.
- Detailed programming algorithm changes — those will be specified once we align on the intake question itself.

## Next Steps

1. Co-founder review and feedback on this document via PR comments.
2. Reach alignment on open questions above.
3. Open implementation PRs for Phase 1.
