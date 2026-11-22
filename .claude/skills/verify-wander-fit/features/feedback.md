# In-App Feedback

An athlete can submit a private star rating, report a bug, or request a feature directly in the app. Every submission saves to Convex, confirms with a toast, and shows no in-app submission history list.

## Sub-features

- `profile-feedback-entry`: Profile shows a "Feedback & support" section with `Rate WanderFit` (`feedback-row-rate`), `Report a bug` (`feedback-row-bug`), and `Request a feature` (`feedback-row-feature`), and no "My feedback" / submission history view.
- `private-rating-and-store-review-split`: Private 1–5 star ratings write to `athlete_ratings` (auto-prompted on Today after the 2nd completed workout with a 45-day cooldown, or opened manually from Profile) and never gate or branch into the native OS store review dialog (`expo-store-review`). Native store review eligibility is strictly decoupled on objective milestones (5th completed workout or 1st completed phase check-in, 90-day cooldown, no wait after a private rating) and guarded by `EXPO_PUBLIC_ENABLE_STORE_REVIEW`.
- `bug-report-submission`: Structured bug reports (`bug_reports`) capture zero-PII technical context (platform, OS version, app version, build number, screen route, color scheme, optional workout/program context, optional `posthogSessionId`) with severity (`blocking` / `annoying` / `minor`). Available from Profile, `FlowErrorBoundary` (`error-boundary-report-bug`), Workout Detail (`workout-detail-report-issue`), and Workout Execution (`execute-report-issue`).
- `feature-request-submission`: Categorized feature requests (`feature_requests`) cover 6 areas (`Workouts & Exercises`, `Program & Schedule`, `Progress & Maxes`, `Equipment & Gym/Home`, `App Experience`, `Other`) and confirm with a toast only.
- `internal-tagging-and-guards`: Server-side `isInternal` tags verified Clerk emails matching Convex `INTERNAL_EMAILS`, enforces 10 submissions/hour rate limiting and `gppSessionId` ownership, keeps founder triage functions strictly `internal*`, and removes all 4 feedback tables when `e2e.remove` cleans up a persona.

## Run

- `node scripts/verify/run.mjs all feedback` creates an `onboarded` persona, runs `.maestro/web/feedback.yaml`, and deletes the persona along with its feedback rows.
- The web entry launches and runs `.maestro/journeys/feedback.yaml`, which signs in through `.maestro/subflows/_sign-in.yaml`.

## Why

Silo 1 pre-pilot blocker so Pilot Athletes and founders can submit ratings, workout/programming bug reports, and feature ideas inside the app with zero PII leaks and full App Store / Play Store policy compliance.
