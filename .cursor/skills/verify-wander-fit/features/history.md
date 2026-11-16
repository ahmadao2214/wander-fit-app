# History

An athlete who has finished a workout sees it on the History tab.

## Sub-features

- `history-lists-gpp-session`: a persona provisioned with `--state with-history` (onboarded, plus one completed GPP W1D1 session) signs in, opens History, and sees the session row (`GPP W1D1`) with the completed check (`history-completed`, spoken "Completed") and no "Not finished" chip. The empty state ("No workouts yet") must not show.
- `history-progress-line`: the same persona sees "1 workout done" under the title. Progress lives on History, not on Profile (design audit F06).

## Run

- `node scripts/verify/run.mjs all history` creates the `with-history` persona, runs `.maestro/web/history.yaml`, and deletes the persona (its sessions go with it).
- The web entry launches and runs `.maestro/journeys/history.yaml`, which signs in through `.maestro/subflows/_sign-in.yaml`.

## Why

Regression for PR #105: History read the trainer-era `workoutSessions` table, so it was empty for every GPP athlete. It now reads `gppWorkoutSessions.getHistory`.
