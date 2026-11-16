# First Run

A signed-out athlete opens the app on the First Run (v2, "game night"; design brief in `docs/first-run-v2/`): the promise, five questions on four screens (sport; season calendar; training days; a player card for age group and years training), a two-part reveal (Category, then Plan), then "Save your plan", which creates the account and the program in one step and lands on the Program tab with Day 1 up next. Nothing starts by itself. Replaces the old sign-up and activation journeys. Terms: `GLOSSARY.md`. Decision: `docs/adr/0002-account-after-the-program-reveal.md`.

## Sub-features

- `first-run-promise`: a cleared browser opens on `LET'S BUILD YOUR PLAN FOR THIS SEASON.`, not `WELCOME BACK`.
- `first-run-intake`: `PICK YOUR SPORT` with a `POPULAR` row; Basketball; No set season; Mon/Wed/Fri preselected (`3 SESSIONS A WEEK`, `Mon / Wed / Fri`); `AGE GROUP` Performance, then `YEARS TRAINING FOR YOUR SPORT` New to training, which starts the reveal with no Continue.
- `first-run-reveal`: `BASKETBALL PLAN` (the category holds 3 s first; the journey reaches it again through the POWER chip: `BASKETBALL TRAINS FOR`, `Tap to go back to your plan`), `NO SET SEASON · 12-WEEK PLAN`, the phases in plain English (`Build the base`), the week line from the real GPP week 1 templates (`Day 1 · … · Lower Body A · About 28 min`) and the total `36`.
- `first-run-save`: the sheet has no skip; email, password and Clerk's code `424242` create the account and save the program.
- `first-run-program`: the save lands on the Program tab: `Up next · <day>` for Day 1 under the same phase bar, and no warm-up.
- `first-run-inspect`: after Maestro passes, `persona inspect` must show `intakeCompleted`, `hasProgram`, GPP week 1 day 1 and `firstLaunchRecorded: true`.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed; the e2e URL is set; the e2e deployment runs this checkout's functions and has the generated templates (`node scripts/verify/run.mjs deploy`).

- `node scripts/verify/run.mjs all first-run` runs it. Like the old sign-up flow, the runner makes no account first: it writes a new `e2e-<run>-signup+clerk_test@example.com` address and a random password to `e2e-artifacts/persona-latest.json` and passes them as `PERSONA_EMAIL` and `PERSONA_PASSWORD`. The `-signup` shape is what `delete` and `sweep` accept.
- The web entry `.maestro/web/first-run.yaml` launches with a cleared state and runs `.maestro/journeys/first-run.yaml`.
- After Maestro passes, the runner inspects the account, then redacts the password and deletes the Clerk user and its Convex rows whether or not anything failed.
- Proof is `01-promise` through `09-program` and `startRecording/recording.mp4` under `e2e-artifacts/first-run/web/`.

## Gotchas

- Maestro web reports a pressable's accessibility label as its id, so sport tiles and choice rows are matched by their label (`id: "Basketball"`, `tapOn: "No set season"`), not their testID. Inputs and Tamagui buttons keep their testID (`save-plan-name`, `first-run-continue`).
- The season calendar pushes `No set season` below the 625px viewport, so the journey swipes the inner list before tapping it.
- Don't assert the category beat on arrival: Maestro web's settle wait after the last answer can outlast its 3 s hold. Revisit it through the POWER chip instead.
- Headlines are uppercased in the string (not with `textTransform`), so Maestro matches them in caps on web and native alike.
- No set season keeps the program at 12 weeks whatever the date, so the session count is stable. A season date would make it depend on the day the flow runs.
- The shared wander-fit-e2e dev deployment is redeployed by other runs. If the save fails with `extra field firstLaunchAt`, the deployment is running older functions: run `deploy` again.
- The reveal (`getWeekOverview`) and Today need the generated program templates. `deploy` runs the generator per category.
- Native: there is no Maestro flow for the First Run on iOS. On the iOS 27.2 simulator, Maestro 2.12.1's `inputText` dropped characters from the email (`signup+clerk_test@example.com` arrived as `sinupcer_test@eaple.com`), which sends Clerk a real address. Prove native runs with the device tooling (`agent-device fill`) and a recording instead.
- A local simulator build must be signed (ad-hoc is enough: `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO`). An unsigned build has no keychain access, so SecureStore fails: the draft never persists and Clerk can't keep a session.
