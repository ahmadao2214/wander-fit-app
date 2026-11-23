# Performance baseline (scripts/perf)

The baseline answers one question per journey: how much work does the app do, and does it hang, on a Release build? The numbers describe what the athlete's phone does, not how the code is written. That way the same journeys and the same bar can be applied to a later rewrite, such as Expo's Exact.

## Layers

| Layer          | Build and device                               | Tool                                                                       | Measures                                                                | Compare with                                                |
| -------------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| Work and hangs | Release simulator app (`bun run review:build`) | `scripts/perf/baseline.mjs` (Instruments, Time Profiler)                   | journey time, potential hangs, main-thread and JS-thread busy ms        | other runs on the same Mac                                  |
| Dropped frames | Release build on a physical iPhone             | `scripts/perf/baseline.mjs --template "Animation Hitches" --device <udid>` | hitch count and total hitch time                                        | other runs on that phone                                    |
| React work     | Dev build with Metro, simulator                | Argent React profiler (`argent-react-native-profiler` skill)               | re-renders per component, slow commits (16 ms or more), JS CPU hotspots | other dev-build runs only (dev renders are about 3x slower) |

Notes:

- Apple's Animation Hitches instrument doesn't run on the simulator ("Hitches is not supported on this platform"). Dropped frames are measured on a phone only.
- The simulator runs on the Mac's CPU, so its numbers look better than a phone's. Use it for before and after on one machine. Use a physical iPhone for the true number, before a release or a platform decision.
- Screen recordings capture at 30fps, so a choppy video alone doesn't show jank.
- `xctrace --all-processes` records every simulator on the Mac, and another simulator can run a build with the same process name (`asrafit`). The first baseline was skewed this way: a dev build on another simulator supplied most of its main-thread time. Now the harness refuses to record while the app runs on another booted simulator. It keeps only the instance that ran the journey on the target device (read from `launchctl` after the journey; for a cold start, that's the relaunched instance, not the one stopped). Older traces are rebuilt with `resummarize --exclude-pids <pid>`, which keeps the last-running app pid.
- `jsThreadFound` says whether React Native's JS thread was found. On another runtime (Exact) `jsThreadBusyMs` would read 0, so compare `appBusyMs` (the whole process) there.
- The Animation Hitches path hasn't been run against a real device export yet. Check that hitch rows were matched before trusting a 0.
- Maestro reads the screen through accessibility, and that runs on the app's main thread. In one tabs trace, accessibility snapshot stacks made up about half of the app's main-thread samples. It is not known to be constant across runs or across app versions (a bigger view tree costs more to read), so compare main-thread time only between runs of the same journey, and treat it as a diagnostic, not the headline. Hangs are the sturdier number.
- Time Profiler figures are sampled CPU estimates (1 ms samples), not exact durations.

Known gaps (follow-ups):

- `flowMs` includes Maestro's start-up and isn't a launch time. A user-ready window (first action to a stable endpoint) and launch time from the App Launch template on a device are still to do.
- `run` finds the app's pid with `xcrun simctl spawn … launchctl list`, which only works on a simulator. On a physical iPhone every run would fail with "not running after the journey". Before the device run, read the pid from `xcrun devicectl device info processes` instead.
- The current baseline (`perf/results/2026-11-22-sim-release-*.json`) is provisional: another simulator's app was using CPU while it was recorded. Re-record it on a quiet machine, alongside the iPhone run.
- The tabs and workout journeys run on a freshly created account, so History is short and the workout list depends on the plan's first day. A dedicated persona with fixed history would make runs across days comparable.

## Run it

```bash
bun run review:build      # Release simulator app; needs a checkout path with no spaces (docs/SCREEN_REVIEW.md)
xcrun simctl install <udid> e2e-artifacts/explore/build/Build/Products/Release-iphonesimulator/asrafit.app
# Once per install: walk the First Run and save the plan to a new +clerk_test account.
maestro --device <udid> test -e PERSONA_EMAIL=<e2e-…-signup+clerk_test@example.com> -e PERSONA_PASSWORD=<…> .maestro/perf/_setup-first-run.yaml
bun run perf:baseline cold-start --runs 5 --label <name>
bun run perf:baseline tabs --runs 5 --label <name>
bun run perf:baseline workout-logging --runs 5 --label <name>
```

Each journey is `.maestro/perf/<journey>.yaml` and ends where it started, so runs repeat. Traces go to `perf/runs/` (gitignored), and summaries go to `perf/results/<label>-<journey>.json`, which are committed.

Setup gotchas:

- The keychain survives `clearState`, so a Clerk session from another test account can still be signed in. Sign-in then bounces back to the First Run, and the save sheet says "Signed in as …". Tap "Use a different account" first.
- iOS shows "Use Strong Password?" over the password field and can swallow typed characters. The setup flow closes it. If it still interferes, fill the field from stdin with agent-device.

## When to run it

Run it on demand, on this Mac: before and after a change meant to speed something up, and before the Friday release. It isn't a pre-commit hook or a per-PR CI job, because it needs a native build and several minutes of recording. A PR that claims a speedup includes the before and after summaries (or flame graphs).

## Reading a number

Vet a number with the pstack `benchmark-checklist` skill before acting on it. Use at least 5 runs per side, alternating sides when comparing. Report the median and range, and name what limits the number. A gap smaller than the run-to-run spread means no measurable difference.
