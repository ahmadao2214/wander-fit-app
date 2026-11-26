# Reassessment: the end-of-block check-in

When a block's time runs out, `advanceToNextDay` sets `reassessmentPendingForPhase` and the athlete gets a check-in before the next block. The check-in tells the truth about the block (design audit F04, approved 2026-11-14): a block that ended is not the same as a block that was finished, and the athlete chooses what comes next.

## Behavior

- **Today** shows "Your Build block is over" (the phase as a word: Build, Train or Sharpen) with a **Check in** button while a check-in is pending. The prompt after the last workout of a block says the same, with no trophy.
- **Recap** (`/(reassessment)/celebration`, root testID `block-recap-<none|partial|full>`) shows the sessions done out of the sessions planned, the block length and its dates. Only a block with every planned session done says "You finished Build". The recap is on the sport theme, so it shows no confetti. Zero sessions reads "No sessions were logged in this block."
- **Check-in** asks how the block felt (required), energy and notes (optional). **Maxes** can be updated or skipped.
- **Decision** (`/(reassessment)/results`) summarizes the check-in and offers **Move on to Train** (`decision-move_on`) or **Repeat Build** (`decision-repeat`). Phases read as Build, Train and Sharpen. Nothing is preselected and the confirm button (`decision-confirm`) reads "Choose an option" until one is. Confirming saves and goes straight to Today. There is no success screen and no timed redirect.
- **Backend:** `completeReassessment` takes `decision` (`move_on` by default, for older app versions). Repeat keeps the phase, resets to week 1 day 1, starts a new block date, unlocks nothing and never raises the skill level. The check-in record stores `reassessmentDecision`. Session counts only include the current block, so a repeated block starts from zero.

## Web flow

`node scripts/verify/run.mjs all reassessment` runs `.maestro/web/reassessment.yaml` with a `phase-end` persona: a GPP block that ran its full length with no sessions logged and the check-in pending. It opens the check-in from Today, checks the recap shows "0 of … sessions" with no congratulations, answers "Just right", skips maxes, checks nothing is preselected, chooses Repeat Build, and checks Today is back at Build W1 D1 with no check-in banner. Screenshots: `01-today-check-in`, `02-recap`, `03-decision`, `04-today-repeated`.

## Unit coverage

- `lib/__tests__/reassessment.test.ts`: recap wording for zero, partial and full blocks, dates, and the choice copy.
- `convex/__tests__/reassessmentDecision.test.ts`: Move on and Repeat against the real mutation, the per-block session count, and the default for older clients.
- `app/__tests__/reassessment-screens.test.tsx`: the recap per outcome, confetti only for a finished block and never with Reduce Motion, and the decision screen's choice, save and error.
