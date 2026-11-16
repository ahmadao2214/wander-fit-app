# Builds and the EAS budget

iOS builds are the scarcest thing in this project. The EAS Free plan gives
**15 iOS builds a month**, and the cycle resets on the **13th**. Cloud
simulator time is a separate budget (60 minutes a month, see
`scripts/sim/README.md`).

Until November 2026 every merge to main built and shipped to TestFlight. That
spent 21 builds in the three days from 13 to 15 November, so builds are now
deliberate.

## The rules

1. **Merging to main never builds.** Merge as often as you like. GitHub
   Actions checks (Jest, typecheck, web E2E) are free and still run on every
   push.
2. **One release build a week, on Friday.** Batch everything merged that week
   into one TestFlight build for the co-founder. Skip the week if nothing
   changed for testers.
3. **Verify before you build.** Changes are proven on the local iPhone
   simulator, the web E2E suite, and unit tests. A TestFlight build is for
   the co-founder to use the app, not for us to find out whether it works.
4. **Never rebuild to fix an upload.** When the build succeeds and only the
   TestFlight upload fails (Apple agreements, certificates, App Store Connect
   outages), resubmit the same build:
   `npx eas-cli submit -p ios --id <build id> --profile production`.
5. **A PR build is the exception.** Build a PR branch only when the co-founder
   has to hold it on a phone before merge, and say so in the PR. It counts
   against the same 15.
6. **Agents never start a build.** No `eas build`, `eas workflow:run`, or
   `testflight-*` tag unless the user asks for that build in that message.

## Budget per cycle (13th to 12th)

| Use | Builds |
|---|---|
| Friday releases (4–5 a cycle) | 5 |
| Hotfix for a release that broke for testers | 2 |
| PR builds the co-founder must try before merge | 3 |
| Reserve (credentials, SDK upgrade, Apple surprises) | 5 |
| **Total** | **15** |

When the reserve is gone, only Friday releases build until the 13th.

## How to release

From an up-to-date main, either:

```sh
# Tag it (leaves a record of what shipped):
git tag testflight-2026-11-20 origin/main
git push origin testflight-2026-11-20

# Or run it directly:
npx eas-cli workflow:run .eas/workflows/release-testflight.yml --ref main
```

Both run `.eas/workflows/release-testflight.yml`: a production iOS build, then
a TestFlight upload. Testers in "Offseason Asrafit Testers" get it
automatically.

To build a PR branch instead: `--ref <branch>`.

Check what's been used this cycle:

```sh
npx eas-cli build:list --platform ios --limit 30
```

or the usage page at https://expo.dev/accounts/amazinaz/settings/usage.

## Before a release

- **Credentials.** The iOS distribution certificate and provisioning profile
  expire on **2026-11-18**. Renew them with `npx eas-cli credentials -p ios`
  (needs the Apple login) before the next release, or the build fails.
- **Apple agreements.** If an upload fails with "Unable to find Apple ID" or
  a 403, check for an unaccepted agreement in App Store Connect first, wait
  about 10 minutes after accepting, then resubmit (rule 4).

## Later: over-the-air updates

Most changes in this app are JavaScript only. Adding `expo-updates` (EAS
Update) would let those reach TestFlight testers without a build at all;
only native changes (new native modules, SDK upgrades, `app.json` native
config) would need one. It has to ship inside one build first, so the
earliest it can pay off is the release after it lands.
