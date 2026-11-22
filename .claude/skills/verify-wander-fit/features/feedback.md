# In-app feedback

An athlete rates the app privately, reports a bug, or requests a feature from inside the app. New journey in PR #131. Every submission saves to Convex and confirms with a toast. There is no in-app list of past submissions.

## Sub-features

- `profile-feedback-entry`: Profile has a "Feedback & support" section with `Rate WanderFit` (`feedback-row-rate`), `Report a bug` (`feedback-row-bug`) and `Request a feature` (`feedback-row-feature`), and no "My feedback" history view.
- `private-rating`: a 1–5 star rating with an optional note writes to `athlete_ratings`. Today prompts for it after the 2nd completed workout, with a 45-day cooldown after a dismissal; Profile opens it at any time.
- `store-review-split`: the native store review (`expo-store-review`) never depends on the private rating. It asks on objective milestones (5th completed workout or 1st completed phase check-in, 90-day cooldown, no wait after a private rating) and only when `EXPO_PUBLIC_ENABLE_STORE_REVIEW` is set.
- `bug-report`: a title, details and severity (`blocking` / `annoying` / `minor`) write to `bug_reports` with technical context and no PII: platform, OS and app version, build number, route, color scheme, optional workout and program context, optional `posthogSessionId`.
- `feature-request`: one of six categories, a title and details write to `feature_requests`.
- `guards`: `isInternal` is set server-side from verified Clerk emails in Convex `INTERNAL_EMAILS`; 10 submissions an hour; `gppSessionId` must belong to the athlete; triage functions are `internal*` only; `e2e.remove` deletes all four feedback tables for a persona.

## How to get to it (user POV)

- Sign in, tap the Profile tab, then a row under "Feedback & support", just above Settings and Sign Out.
- Report a bug also opens from Workout Detail (`workout-detail-report-issue`), the workout player (`execute-report-issue`) and the error screen (`error-boundary-report-bug`).
- The rating also opens by itself on Today after the 2nd completed workout.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state onboarded`. `run.mjs all` creates it, already inside the rating cooldown, so the Today prompt stays closed.

- **Whole journey.** Run `node scripts/verify/run.mjs all feedback`. It exits `0` with `- feedback: passed`, and the persona and its feedback rows are deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card`.
- **Open Profile.** It taps `Profile`, waits for `Training info`, opens `/profile#sign-out`, waits for `id: feedback-row-rate`, and asserts `Feedback & support` and no "my feedback" / "my submissions" text (`01-profile-feedback`).
- **Rating.** It taps `feedback-row-rate`, then `id: "rating-star-5|5 stars"`, types a note, swipes the sheet until `rating-submit-button` shows, taps it, and waits for `Thanks for the rating!` with no `rating-error` (`02-rating-submitted`).
- **Bug report.** It taps `feedback-row-bug`, fills `bug-title-input` and `bug-details-input`, swipes to `bug-submit-button`, taps `bug-severity-minor` and submit, and waits for `Bug report sent` with no `bug-error` (`03-bug-submitted`).
- **Feature request.** It taps `feedback-row-feature`, then `feature-category-progress_maxes`, fills the title and details, taps `feature-submit-button`, and waits for `Idea sent!` with no `feature-error` (`04-feature-submitted`).
- **Side effect.** Each submission is a Convex row (`athlete_ratings`, `bug_reports`, `feature_requests`), covered by `convex/__tests__/feedback.test.ts`. The flow checks the toast that follows each successful send.
- **Proof.** `e2e-artifacts/feedback/web/<timestamp>/feedback/` holds the four screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/feedback/web/result.json` with `"status": "passed"`.

## Gotchas

- Profile scrolls inside a React Native `ScrollView`, which Maestro web's `scroll` doesn't move. The flow opens `/profile#sign-out` to reach the feedback rows (`.maestro/flow-layout.md`).
- Each sheet's submit button starts below the 625px web viewport, and Maestro web leaves off-screen elements out. The flow repeats a swipe inside the sheet until the button shows.
- Each toast covers the center of the next row. The flow waits for it to clear before the next tap.
- On web a star's id is its aria label (`5 stars`); on native it is the testID (`rating-star-5`). Keep both in the selector.
- A persona made outside `e2e.provision` may see the rating prompt on Today, which blocks other taps.
- The native store review dialog can't be driven from the web harness; it needs a dev client built with `expo-store-review`.
