# First Run

A signed-out athlete opens the app on the First Run (v2, "game night"; brief in `docs/first-run-v2/`): the promise, five questions on four screens (sport; season calendar; training days; a player card for age group and years training), a two-part reveal (Category, then Plan), then "Save your plan", which creates the account and the program in one step and lands on the Program tab with Day 1 up next. Nothing starts by itself. Terms: `GLOSSARY.md`. Decision: `docs/adr/0002-account-after-the-program-reveal.md`.

## Sub-features

- `first-run-promise`: a cleared browser opens on `LET'S BUILD YOUR PLAN FOR THIS SEASON.`, not `WELCOME BACK`.
- `first-run-intake`: `PICK YOUR SPORT` with a `POPULAR` row; searching "hockey" shows Ice Hockey and Field Hockey and folds `POPULAR` away (regression); Basketball found by search; No set season; Mon/Wed/Fri preselected (`3 SESSIONS A WEEK`, `Mon / Wed / Fri`); `AGE GROUP` Performance, then `YEARS TRAINING FOR YOUR SPORT` New to training, which starts the reveal with no Continue.
- `first-run-reveal`: `BASKETBALL PLAN` (the category holds 3 s first; the journey reaches it again through the POWER chip: `BASKETBALL TRAINS FOR`, `Tap to go back to your plan`), `NO SET SEASON · 12-WEEK PLAN`, the phases in plain English (`Build the base`), the week line from the real GPP week 1 templates (`Day 1 · … · Lower Body A · About 28 min`) and the total `36`.
- `first-run-save`: the sheet has no skip; email, password and Clerk's code `424242` create the account and save the program.
- `first-run-program`: the save lands on the Program tab: `Up next · <day>` for Day 1 under the same phase bar, and no warm-up.
- `first-run-inspect`: after Maestro passes, `persona inspect` shows `intakeCompleted`, `hasProgram`, GPP week 1 day 1 and `firstLaunchRecorded: true`.

## How to get to it (user POV)

- Open the site in a browser with no Clerk session and no saved draft. The First Run is the first screen.
- From the sign-in screen, there is no way back into the First Run except signing out or clearing the browser.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The e2e deployment runs this checkout's functions and has the generated program templates (doctor's `seed:` line shows a non-zero template count). If it runs older functions, the founder or CI redeploys it; agents don't run `deploy`.

- **Whole journey.** Run `node scripts/verify/run.mjs all first-run`. No account is made first: the runner writes a new `e2e-<run>-signup+clerk_test@example.com` address and a random password to `e2e-artifacts/persona-latest.json` and passes them as `PERSONA_EMAIL` and `PERSONA_PASSWORD`. It exits `0` with `- first-run: passed`.
- **Entry.** `.maestro/web/first-run.yaml` launches with a cleared state and runs `.maestro/journeys/first-run.yaml`. `LET'S BUILD YOUR PLAN FOR THIS SEASON.` appears (`01-promise`).
- **Intake.** The journey taps `id: "Basketball"` (`02-sport`), swipes the season list and taps `No set season` (`03-season`), keeps Mon/Wed/Fri (`04-days`), and picks Performance and New to training (`05-about`). The reveal starts with no Continue.
- **Reveal.** The journey taps the POWER chip and sees `BASKETBALL TRAINS FOR` (`06-category`), goes back, and sees `NO SET SEASON · 12-WEEK PLAN`, `Build the base` and `36` (`07-plan`).
- **Save.** `Save your plan` opens the sheet (`08-save-plan`); the journey fills `save-plan-name`, the email, the password and code `424242`. The Program tab shows `Up next · …` (`09-program`).
- **Side effect.** After Maestro passes, the runner runs `persona inspect` and fails the flow unless it shows `intakeCompleted`, `hasProgram`, GPP W1 D1 and `firstLaunchRecorded: true`. The `inspect:` line is in the run's output.
- **Proof.** `e2e-artifacts/first-run/web/<timestamp>/first-run/` holds `01-promise` through `09-program` under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/first-run/web/result.json` with `"status": "passed"`.

## Gotchas

- Maestro web reports a pressable's accessibility label as its id, so sport tiles and choice rows match by label (`id: "Basketball"`, `tapOn: "No set season"`), not their testID. Inputs and Tamagui buttons keep their testID (`save-plan-name`, `first-run-continue`).
- The season calendar pushes `No set season` below the 625px viewport, so the journey swipes the inner list before tapping it.
- Don't assert the category beat on arrival: Maestro web's settle wait after the last answer can outlast its 3 s hold. Revisit it through the POWER chip.
- Headlines are uppercased in the string (not with `textTransform`), so Maestro matches them in caps on web and native alike.
- No set season keeps the program at 12 weeks whatever the date, so the session count is stable.
- The shared wander-fit-e2e dev deployment is redeployed by other runs. A save failing with `extra field firstLaunchAt` means it is running older functions: report it as a backend precondition, don't edit the flow.
- The reveal (`getWeekOverview`) and Today need the generated program templates. A zero template count in doctor means the deployment needs `deploy`.
- The runner deletes the Clerk user and its Convex rows whether or not anything failed, after redacting the password from the evidence.
- Native: there is no Maestro flow for the First Run on iOS. Maestro 2.12.1's `inputText` dropped characters from the email on the iOS 27.2 simulator, which sends Clerk a real address. Prove native runs with device tooling instead. A local simulator build must be signed (ad-hoc is enough), or SecureStore fails.
