# Decisions

Routine calls the team made without asking, one line each, newest first. Anything that needs Azhar's approval is not logged here; see `TEAM.md`.

Format: `YYYY-MM-DD · who · decision · why`.

- 2026-11-23 · Lead · Fixed Astra's round-3 finding on #179 after the third round, without a fourth review · the fix is the one-line guard Astra asked for; Azhar decides whether it needs another round.
- 2026-11-23 · Lead · A transport crash more than 15 s into one long-running command is not retried (#179) · the rule can't tell it from a true 30 s hang, and declining keeps real failures from passing.
- 2026-11-23 · Lead · A run whose log ends in any command failure that isn't a proven transport crash gets no retry, including under the older cold-start rule (#179) · a real failure must never be retried into a pass.
- 2026-11-23 · Builder · Fixed the web flake with a retry keyed to Maestro's crash signature, not a wait in the flow (#179) · the wait reads the page through the same call that crashes.
- 2026-11-23 · Builder · Kept one retry, though one run crashed twice in a row (#179) · a rare double crash failing the shard is better than a looser rule.
- 2026-11-23 · Lead · Cancelled the first #174 Builder after it hit the usage limit, then relaunched · a limit-stalled agent resumes by itself, and two would have worked the same task.
- 2026-11-23 · Lead · With no max set, the maxes card is one "Add your maxes" row that opens all three lifts at once (Profile refresh) · three bold "Add"s were the loudest thing on a new athlete's Profile; the sheet's bulk mode existed and had no caller.
- 2026-11-23 · Lead · The 1RM sheet rises to 80% (one lift) or 92% (all three) while the keyboard is up (Profile refresh) · the number pad has no Done key and covered Save; this follows AGENTS.md's sheet-with-inputs pattern.
- 2026-11-23 · Lead · Pressed rows and tiles use `$surfaceActive`, on App settings too (Profile refresh) · `$surfaceHover` is #F8FAFC on white, which nobody can see under a thumb.
- 2026-11-23 · Lead · Profile holds the phase block's and the maxes card's places while the program loads (Profile refresh) · they used to arrive late and push the page down about 150pt.
- 2026-11-23 · Lead · The header counts weeks to the end of the three phases (weeksPerPhase × 3), not to totalProgramWeeks (Profile refresh) · the season countdown can be longer or shorter than the scheduled program; Astra showed "Week 12 of 14" with every bar full.
- 2026-11-23 · Lead · Profile's four tappable rows set no aria-label (`nameFromContent`) (Profile refresh) · Maestro web reports a labelled element by its label, and four flows find these rows by testID.
- 2026-11-23 · Lead · Email is a row with the address on its own line, and the header says the day ("Week 6 of 12 · Day 3") (Profile refresh) · Astra: a long address was cut off beside its label, and the old screen showed the day.
- 2026-11-23 · Lead · The status bar turns dark again once the navy header scrolls out from under it; the maxes card needs a program to show (Profile refresh) · light icons vanished on the light page; the card overlaps a phase track that isn't there without a program.
- 2026-11-23 · Lead · Profile's facts group keeps the label "Training info", not the spec's "Training" (Profile refresh) · six Maestro flows wait for that text to know Profile has loaded.
- 2026-11-23 · Lead · Group labels on Profile and App settings stay at SectionTitle size, not the mockup's smaller label (Profile refresh) · VoiceOver still gets a heading and both screens match the rest of the app.
- 2026-11-23 · Builder 2 · The Privacy switches take the shared row: label weight 500 not 600, minimum height 52 not 60 (Profile refresh) · one row style, as the spec asks.
- 2026-11-23 · Builder 2 · SettingsRow has a supportingTestID, and a row with a control puts no label on the row itself (Profile refresh) · `analytics-opt-in-status` is read by a test, and Maestro's "Share anonymous usage analytics" must still match only the Switch.
- 2026-11-23 · Builder 1 · PhaseTrack colour props are typed GetThemeValueForKey<'color'>, not ColorTokens (Profile refresh) · the header's fixed hex and rgba values aren't tokens; the type still takes tokens like $brand5.
- 2026-11-23 · Builder 1 · phaseTrack also returns the spoken label, and the progress bar sets no min/max/now value (Profile refresh) · the label is pure logic and tested in lib; a value would make VoiceOver read the position twice.
- 2026-11-23 · Builder 1 · A weeksPerPhase or totalProgramWeeks below 1 uses the fallback, and a fractional week rounds down (Profile refresh) · the track never divides by zero or shows "Week 2.5".
- 2026-11-23 · Lead · Profile rows take the bare 18pt icon App settings shipped in #164, not the 32pt tile from the approved mockup (Profile refresh) · one row style across both screens, and #164's rows are a day old.
- 2026-11-23 · Lead · Wrote the #170 and #171 PR descriptions myself · Neon's Antigravity quota was used up (resets in about 5 days), and the charter doesn't allow switching providers unasked.
- 2026-11-23 · Lead · Left Astra's last finding on #170 open (a duplicate issue if 1,000 open issues fuzzy-match one flow's title) · the repo has about ten open issues; paging the whole tracker on every failure isn't worth it. Azhar's call after 3 rounds.
- 2026-11-23 · Lead · Fixed Astra's findings on #170 and #171 in the Builders' worktrees instead of re-briefing them · each fix was small and the Builders had finished.
- 2026-11-23 · Lead · `persona sweep` needs the dev deploy key, the one E2E dev host (`E2E_DEV_HOST`) and an `sk_test_` Clerk key; `.env.e2e` mode is refused (#171) · a bulk delete gets an allowlist, and the Convex CLI can load another key from `.env.local` in local mode.
- 2026-11-23 · Lead · Android failures are filed by a separate `report-failures` job that never runs on a PR; the Android job stays read-only (#170) · PR code never runs with `issues: write`.
- 2026-11-23 · Lead · Failed flow names and their error text travel in two job outputs (#170) · GitHub drops an output that contains a masked secret, and the names must survive that.
- 2026-11-23 · Lead · The Android build step times out at 40 min and the emulator step at 25, under the job's 75 (#170) · a step timeout fails the job and still reports; a job timeout cancels it.
- 2026-11-23 · Builder 1 · Error text in a failure issue goes in a code block with backticks swapped for `'`, cut to 500 characters (#170) · an `@name` or markdown in an error can't notify anyone or break the issue.
- 2026-11-23 · Builder 1 · Duplicate failures for one flow in a run collapse into one report (#170) · one issue or comment per flow per run.
- 2026-11-23 · Builder 2 · The sweep job stays out of the `e2e-backend` concurrency group (#171) · it doesn't deploy or seed and only touches accounts older than 2h, so main's E2E needn't wait on it.
- 2026-11-23 · Builder 2 · The sweep job runs on `!cancelled()`, not `always()` (#171) · a cancelled nightly shouldn't sweep.
- 2026-11-23 · Builder 2 · No `--dry-run` for `persona sweep` (#171) · the target checks make the job safe without it.
- 2026-11-23 · Lead · Shut down the idle iPhone 17e simulator and deleted one unavailable simulator ("iPhone Duo") · no thread was driving them; iPhone 17 and iPhone 18 Pro had live sessions and were left alone.
- 2026-11-23 · Lead · Kept the required check's name "Web E2E (advisory)" when making it required (#88) · renaming needs the workflow and the protection rule changed together; follow-up on #137.
- 2026-11-23 · Lead · Builders don't build the Android APK or boot an emulator locally · a local release build took 31 min and starved the laptop; a CI run on the PR (`run-native-e2e` label) is the Android proof.
- 2026-11-23 · Lead · Builders report judgment calls in their final message and the Lead logs them here · two Builders appending to this file in parallel would conflict.
- 2026-11-23 · Lead · Android failure issues are filed on schedule, dispatch and push runs only; PR runs are dry-run · a labelled PR that breaks a flow shouldn't open a public issue.
- 2026-11-23 · Lead · The nightly persona sweep goes in `nightly-e2e.yml`, not `android-e2e.yml` · keeps the two #83 slices in different files so they can run in parallel.
- 2026-11-24 · Lead · Policy pages publish as pilot drafts with no contact email; every request goes through the `/support` form · Azhar's call ("Can't it just be a form?"); the drafts are not attorney-reviewed.
- 2026-11-24 · Lead · The policy pages name the operator as "WanderFit" and leave governing law for later · no company is registered yet, and a state can't be guessed.
- 2026-11-24 · Lead · Changed `DEFAULT_SITE_URL` to the landing site instead of setting `EXPO_PUBLIC_SITE_URL` per build · one change covers web, EAS and local builds, and an EAS variable could still override it.
