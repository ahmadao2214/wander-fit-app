# History

An athlete who has finished a workout sees it on the History tab.

## Sub-features

- `history-lists-gpp-session`: a persona provisioned with `--state with-history` (onboarded, plus completed GPP W1D1 sessions: one now and one at noon UTC on every day of the two Monday-to-Sunday weeks before this one) signs in, opens History, and sees the session row (`GPP W1D1`) with the completed check (`history-completed`, spoken "Completed") and no "Not finished" chip. The empty state ("No workouts yet") must not show.
- `history-progress-line`: the same persona sees "15 workouts done · 2 weeks on plan" under the title. Progress lives on History, not on Profile or Today (design audit F06).
- `history-weeks-on-plan`: weeks on plan (`lib/weeksOnPlan.ts`) counts Monday-to-Sunday weeks in a row where the athlete did at least their scheduled number of workouts, on any days. It shows only from 2 up and only on History. It never reads "0 weeks" or "streak lost": after a short week it just drops out of the line. Today's caption under the phase shows "N workouts done" only.

## Run

- `node scripts/verify/run.mjs all history` creates the `with-history` persona, runs `.maestro/web/history.yaml`, and deletes the persona (its sessions go with it).
- The web entry launches and runs `.maestro/journeys/history.yaml`, which signs in through `.maestro/subflows/_sign-in.yaml`.

## Why

Regression for PR #105: History read the trainer-era `workoutSessions` table, so it was empty for every GPP athlete. It now reads `gppWorkoutSessions.getHistory`.
