# Decisions

Routine calls the team made without asking, one line each, newest first. Anything that needs Azhar's approval is not logged here; see `TEAM.md`.

Format: `YYYY-MM-DD · who · decision · why`.

- 2026-11-23 · Lead · Shut down the idle iPhone 17e simulator and deleted one unavailable simulator ("iPhone Duo") · no thread was driving them; iPhone 17 and iPhone 18 Pro had live sessions and were left alone.
- 2026-11-23 · Lead · Kept the required check's name "Web E2E (advisory)" when making it required (#88) · renaming needs the workflow and the protection rule changed together; follow-up on #137.
- 2026-11-23 · Lead · Builders don't build the Android APK or boot an emulator locally · a local release build took 31 min and starved the laptop; a CI run on the PR (`run-native-e2e` label) is the Android proof.
- 2026-11-23 · Lead · Builders report judgment calls in their final message and the Lead logs them here · two Builders appending to this file in parallel would conflict.
- 2026-11-23 · Lead · Android failure issues are filed on schedule, dispatch and push runs only; PR runs are dry-run · a labelled PR that breaks a flow shouldn't open a public issue.
- 2026-11-23 · Lead · The nightly persona sweep goes in `nightly-e2e.yml`, not `android-e2e.yml` · keeps the two #83 slices in different files so they can run in parallel.
