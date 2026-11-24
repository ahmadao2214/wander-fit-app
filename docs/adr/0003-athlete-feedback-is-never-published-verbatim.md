# Athlete feedback is never published verbatim

In-app feedback (ratings, bug reports, feature requests) stays in Convex, and nothing an athlete typed is copied to GitHub. The repository is public and some athletes are 14–17, so an automatic copy would publish a minor's words, and whatever personal detail they put in them, where they can be indexed and can't be recalled. Triage reads the rows from Convex once a day and files each issue in its own words, linked back only by the opaque Convex row id. A rewrite can still identify someone, so an issue describes what the app does and says nothing about the person. The triage report to the founders is private and may quote feedback; GitHub never does.

The cost is that "automatic" means a daily triage run, not an issue the moment feedback is sent, and that the issue alone never shows the athlete's exact wording; that has to be read in Convex.

## Considered options

- **File every submission straight into this repo, with a scrubber for personal details.** The most direct, but a scrubber that misses once has published it for good.
- **A private inbox repo that receives every submission verbatim, with triage promoting a rewritten issue here.** Safe, but a second inbox to keep in sync with the statuses Convex already holds.
