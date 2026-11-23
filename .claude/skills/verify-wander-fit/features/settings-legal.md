# Settings legal and account deletion

An athlete finds Help & Support, the Privacy Policy, the Terms of Service and the full Health & Fitness Disclaimer in App Settings, and can delete their account in two steps. New journey in the settings and account deletion PR (Apple 5.1.1(v), Google Play account deletion). The flow walks both delete steps and leaves without deleting; the deletion itself is covered by `convex/__tests__/accountDeletion.test.ts`, `convex/__tests__/clerkWebhook.test.ts` and `app/__tests__/settings.test.tsx`.

## Sub-features

- `settings-legal-links`: the Support & Legal card lists `Help & Support`, `Privacy Policy` and `Terms of Service`, each opening `LEGAL_URLS` (`lib/legal.ts`, from `EXPO_PUBLIC_SITE_URL`) in the browser through `expo-web-browser`. Their accessibility labels end in ", opens in browser".
- `settings-disclaimer`: `Health & Fitness Disclaimer` opens a sheet in the app with the full disclaimer (five numbered sections) and a button to the Terms of Service.
- `settings-delete-explain`: `Delete account` opens step one: what is lost (program, workout history, 1RM maxes, Intake answers) and that an App Store or Google Play subscription has to be cancelled in device settings. `Keep my account` (`delete-account-cancel`) closes it.
- `settings-delete-confirm`: `Continue` (`delete-account-continue`) opens step two. `Permanently delete my account` (`delete-account-submit`) stays disabled until `DELETE` is typed in `delete-account-confirm-input`. `Back` (`delete-account-back`) returns to step one.
- `settings-delete-run`: confirming calls `api.users.deleteMyAccount` (Clerk user, then every Convex record), clears the First Run draft, signs out and opens the First Run. Unit tests only.

## How to get to it (user POV)

- Sign in, tap the Profile tab, tap App settings near Sign Out, then scroll past Use with Claude.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state onboarded`. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all settings-legal`. It exits `0` with `- settings-legal: passed`, and the persona is deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card`.
- **Open App Settings.** It taps `Profile`, opens `/profile#sign-out`, taps `profile-app-settings` and waits for `App Settings`.
- **Support & Legal.** It swipes the ScrollView up until `id: "Delete account"` is visible, then asserts `Support & Legal` and the three link ids and `id: "Health & Fitness Disclaimer"` (`01-support-legal`). It does not tap the links.
- **Disclaimer.** It taps `id: "Health & Fitness Disclaimer"`, waits for "Not Medical Advice or Physical Therapy" and the notice line (`02-disclaimer`), then taps `id: "Close"` and waits for the sheet to go.
- **Delete, step one.** It taps `id: "Delete account"`, waits for `Delete your account?` and asserts the workout history and App Store or Google Play lines (`03-delete-explain`).
- **Delete, step two.** It taps `delete-account-continue`, waits for `delete-account-confirm-input` and asserts `Permanently delete my account` (`04-delete-confirm`).
- **Leave.** It taps `delete-account-back`, then `delete-account-cancel`, and asserts the `Delete account` row again (`05-account-kept`).
- **Side effect.** None: the flow never confirms the deletion.
- **Proof.** `e2e-artifacts/settings-legal/web/<timestamp>/settings-legal/` holds the five screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `result.json` with `"status": "passed"`.

## Gotchas

- The flow stops before `Permanently delete my account`. The runner deletes the persona after every flow, and the e2e deployment would also need `CLERK_SECRET_KEY` for `deleteMyAccount`. To exercise a real deletion, use a disposable account made for it, never the shared automated-test account.
- The link rows open new tabs on public pages that may not be live yet, so the flow asserts the rows and doesn't follow them.
- App Settings scrolls inside a React Native `ScrollView`, which Maestro web's `scroll` doesn't move. The flow swipes (`.maestro/flow-layout.md`).
- On web, a pressable with an accessibility label is matched by that label (`id: "Delete account"`), while Tamagui buttons keep their testID (`delete-account-continue`).
- On the 625px web viewport the delete sheet's `Keep my account` starts below the fold; the flow swipes the sheet's content up to it. A closed sheet parks just under the viewport, where its title still counts as visible, so the flow waits for `delete-account-cancel` to go instead.
- Both sheets use `FeedbackSheetFrame`, whose close button is labelled `Close`. If a closed sheet ever stays in the tree on web, `id: "Close"` can match the wrong one; close the delete sheet with `delete-account-cancel` instead.
