# First Run

A signed-out athlete opens the app on the First Run: the promise, five questions on four screens (sport; season; training days; age group and years training), the reveal of their real Day 1, then "Save your plan", which creates the account and the program in one step, and "You're set." into Day 1's warm-up. Replaces the old sign-up and activation journeys. Terms: `GLOSSARY.md`. Decision: `docs/adr/0002-account-after-the-program-reveal.md`.

## Sub-features

- `first-run-promise`: a cleared browser opens on `Let's build your plan for this season.`, not `WELCOME BACK`.
- `first-run-intake`: Basketball shows `Basketball · Power` in Your program; No set season; Mon/Wed/Fri preselected (`3 days a week`); Performance and New to training.
- `first-run-reveal`: the reveal reads the real GPP week 1 day 1 template: `Lower Body A - Foundation`, `36 sessions over 12 weeks`, `Basketball trains for Power.`
- `first-run-save`: the sheet has no skip; email, password and Clerk's code `424242` create the account and save the program.
- `first-run-start`: `You're set.`, then Start Day 1 lands on `WARMUP`.
- `first-run-inspect`: after Maestro passes, `persona inspect` must show `intakeCompleted`, `hasProgram`, GPP week 1 day 1 and `firstLaunchRecorded: true`.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed; the e2e URL is set; the e2e deployment runs this checkout's functions and has the generated templates (`node scripts/verify/run.mjs deploy`).

- `node scripts/verify/run.mjs all first-run` runs it. Like the old sign-up flow, the runner makes no account first: it writes a new `e2e-<run>-signup+clerk_test@example.com` address and a random password to `e2e-artifacts/persona-latest.json` and passes them as `PERSONA_EMAIL` and `PERSONA_PASSWORD`. The `-signup` shape is what `delete` and `sweep` accept.
- The web entry `.maestro/web/first-run.yaml` launches with a cleared state and runs `.maestro/journeys/first-run.yaml`.
- After Maestro passes, the runner inspects the account, then redacts the password and deletes the Clerk user and its Convex rows whether or not anything failed.
- Proof is `01-promise` through `09-warmup` and `startRecording/recording.mp4` under `e2e-artifacts/first-run/web/`.

## Gotchas

- Maestro web reports a pressable's accessibility label as its id, so sport tiles and choice rows are matched by their label (`id: "Basketball"`, `tapOn: "No set season"`), not their testID. Inputs and Tamagui buttons keep their testID (`save-plan-name`, `first-run-continue`).
- The years choices start below the 625px viewport, under the fixed button. The journey swipes the inner list before tapping `New to training`.
- No set season keeps the program at 12 weeks whatever the date, so the session count is stable. A season date would make it depend on the day the flow runs.
- The shared wander-fit-e2e dev deployment is redeployed by other runs. If the save fails with `extra field firstLaunchAt`, the deployment is running older functions: run `deploy` again.
- The reveal and Today need the generated program templates. `deploy` runs the generator per category.
