# Reassessment

When a block's time runs out, the athlete gets an end-of-block check-in before the next block. The check-in tells the truth about the block (design audit F04): a block that ended is not the same as a block that was finished, and the athlete chooses what comes next, Move on or Repeat.

## Sub-features

- `reassessment-today-banner`: Today shows `Your GPP block is over` with a `Check in` button while a check-in is pending (`advanceToNextDay` set `reassessmentPendingForPhase`). The prompt after a block's last workout says the same, with no trophy.
- `reassessment-recap`: `/(reassessment)/celebration` (root testID `block-recap-<none|partial|full>`) shows sessions done out of planned, the block length and dates. Only a fully done block says `You finished GPP` with confetti, never with Reduce Motion on. Zero sessions reads `No sessions were logged in this block.`
- `reassessment-check-in`: `How did GPP go?` is required; energy and notes are optional. `Update your maxes` can be filled or skipped.
- `reassessment-decision`: `/(reassessment)/results` (`What's next`) offers `Move on to SPP` (`decision-move_on`) or `Repeat GPP` (`decision-repeat`). Nothing is preselected and `decision-confirm` reads `Choose an option` until one is. Confirming saves and goes straight to Today, with no success screen or timed redirect.
- `reassessment-repeat`: Repeat keeps the phase, resets to week 1 day 1, starts a new block date, unlocks nothing and never raises the skill level. Session counts cover only the current block.

## How to get to it (user POV)

- Sign in at the end of a block with the check-in pending, and tap `Check in` on Today.
- Or finish the last workout of a block and follow the prompt.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state phase-end`: a GPP block that ran its full length with no sessions logged and the check-in pending. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all reassessment`. It exits `0` with `- reassessment: passed`.
- **Banner.** After sign-in, Today shows `Your GPP block is over` (`01-today-check-in`). The journey taps `Check in`.
- **Recap.** It asserts `0 of .* sessions` and `No sessions were logged in this block.` and no congratulations (`02-recap`), then taps `Start check-in`.
- **Check-in.** It waits for `How did GPP go?`, taps `id: "Just right"`, swipes, taps `Continue`, waits for `Update your maxes`, swipes, and taps `Skip`.
- **Decision.** It waits for `What's next`, asserts `Move on to SPP` and `Repeat GPP` (`03-decision`), swipes, asserts `Choose an option`, taps `id: "Repeat GPP"` and `Start GPP again`.
- **Result.** Today shows `id: today-workout-card` and `GPP W1 D1.*`, and `Your GPP block is over` is gone (`04-today-repeated`).
- **Side effect.** Today reloads the program from the backend after the confirm, so `GPP W1 D1` with no banner is the stored decision. For a direct read, drive a persona made with `node scripts/verify/persona.mjs create --state phase-end` and run `node scripts/verify/persona.mjs inspect <email>`: `phase` `GPP`, `week` `1`, `day` `1`. Delete it afterwards with `persona.mjs delete <email>`.
- **Proof.** `e2e-artifacts/reassessment/web/<timestamp>/reassessment/` holds the four screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/reassessment/web/result.json` with `"status": "passed"`.

## Gotchas

- `Continue` and the decision confirm button sit below the 625px web viewport inside a ScrollView. The journey swipes to bring them up (`.maestro/flow-layout.md`).
- Web reports the accessibility label as the id, so options match `id: "Just right"` and `id: "Repeat GPP"`, not their testIDs.
- The flow covers Repeat only. Move on to SPP is covered by `convex/__tests__/reassessmentDecision.test.ts`, not live; a live check of it needs a fresh `phase-end` persona driven by hand.
- Unit coverage: `lib/__tests__/reassessment.test.ts` (recap wording), `convex/__tests__/reassessmentDecision.test.ts` (both decisions, per-block counts, default for older clients), `app/__tests__/reassessment-screens.test.tsx` (recap per outcome, confetti rules, decision screen).
