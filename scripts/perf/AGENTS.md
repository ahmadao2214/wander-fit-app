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
- Maestro reads the screen through accessibility, which runs on the app's main thread. In the first tabs trial that was about 7% of main-thread time. It is the same in every run, so it cancels out in before and after comparisons.

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
