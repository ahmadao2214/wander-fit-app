# Repeated week

In a GPP block longer than four weeks, some template weeks run twice (`convex/weekMapping.ts`): in a 5-week phase user weeks 2 and 3 both run the week-2 workouts. A workout done in week 2 is done in week 2 only. When the athlete reaches week 3, Today offers that workout again to start. Regression for PR #145: completion used to be matched by workout, so Today, the calendar and the detail screen showed week 3's repeat as done.

## Sub-features

- `repeated-week-today-offers-repeat`: at GPP W3 D1 with weeks 1-2 done, the Today card reads `GPP W3 D1`, shows `Start Workout`, and does not show `Done`.
- Redo (doing a finished workout again) is logged but doesn't move the program or fill the next repeat. That is covered by `convex/__tests__/longPhaseAndRedo.test.ts`, not this flow.

## How to get to it (user POV)

- Have a season more than 15 weeks out (5+ weeks per phase), finish weeks 1 and 2, and open Today in week 3.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state repeated-week`: a 15-week program (5 weeks a phase) at GPP week 3 day 1, with one completed session for each GPP Novice template of weeks 1 and 2. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all repeated-week`. It exits `0` with `- repeated-week: passed`, and the persona and its sessions are deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card`.
- **Week 3 card.** It waits for `GPP W3 D1.*`, asserts `Start Workout` and that `Done` is not visible (`01-today-week-3`).
- **Proof.** `e2e-artifacts/repeated-week/web/<timestamp>/repeated-week/` holds `01-today-week-3.png` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/repeated-week/web/result.json` with `"status": "passed"`.

## Gotchas

- The card's position line is the program's position (`W3 D1`), not the template's week (`W2`).
- A `Done` badge on the week-3 card for this persona is the #145 bug, not drift.
