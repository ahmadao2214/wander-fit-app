---
name: verify-maestro-retry
description: Recheck the bounded retry contract when Maestro launch, evidence collection, or archive handling changes.
---

Run `bun install --frozen-lockfile`, then `bunx jest --runInBand --runTestsByPath scripts/verify/cold-start-model.test.mjs`. The locked Jest runner enumerates the production operation against a disposable filesystem rather than simulating its file traversal.

A quick failure before flow progress gets exactly one fresh launch, after its evidence is archived. Other outcomes stop immediately; callers receive the last exit status. Mistaking a runner diagnostic for progress makes a recoverable crash fail the verification job.

Coverage: `scripts/verify/run.mjs` (`runWithColdStartRetry`, `hasFlowEvidence`, `archiveAttemptEvidence`) and `scripts/verify/cold-start-model.test.mjs`, reviewed at `0fbe6924cbf570f73f482fe16c45fcaca87f9d8e`. Compare those paths to the sync commit before interpreting a failure. Advance the commit only after checking the oracle against the new evidence contract.

Bound: eight file layouts × five durations (including both sides of 20 seconds) × three exit statuses for each of two launches. A launch returns its normalized status and elapsed time synchronously; no parallel writer, filesystem error, real browser or Maestro process is modeled. Inspect the reported files, status and trace before changing an expectation.

Historical replay: in a disposable checkout, replace `hasFlowEvidence` with `hasScreenshotFiles` from `git show 6ddee53:scripts/verify/run.mjs`, renaming the function and its recursive call. At 11 seconds, exit 1 plus `screenshots/step-004-runFlow.png` wrongly returns 1 without launching again. Restore the classifier and rerun: the same trace archives attempt 1, retries and returns 0 when the second launch succeeds.
