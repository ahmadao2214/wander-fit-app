# Expo 58 Sol review ledger

Scope: `git diff 09fedf6ff21bafa5fbbeffb07e3dc1ddfad74720` plus untracked files. Only upgrade compatibility, regression assets and evidence documentation; production workflows and Explore work are excluded.

## Round 1

- Reviewer: GPT 6.1 Sol, Codex provider, medium reasoning. Usage not returned.
- Verdict: CHANGES.
- S1 / should / fixed in code: draggable-flatlist 4.0.3 calls removed InteractionManager on changed ordered keys. Registry latest is still 4.0.3, so use a minimal persisted Bun patch across its native/ESM/CommonJS entries. Changed-key Jest regression fails without the patch and passes with it; unchanged keys do not schedule reset. Native reordering still requires authenticated device acceptance.
- No declined findings.
- Before review: 12 tracked files (mostly lockfile changes); untracked regression/docs/types files also in review scope. Final size recorded after recheck.

Code approval does not satisfy the runtime/production merge gate. Authenticated athlete/coach and final-config launch proof remain pending; merge/EAS/workflow-change hold remains in force.

## Round 2

- Reviewer: GPT 6.1 Sol, Codex provider, medium reasoning. Usage not returned.
- Verdict: APPROVE. S1 resolved; no new findings.
- Reviewed the persisted patch across all three entrypoints, its installed scratch copy, regression proof, and native regression assets. All 55 suites / 2,140 tests and typecheck pass after the fix (`tests-patched.log`, `typecheck-patched.log`).
- Native reorder and final-config launch remain incomplete; no code-review verdict waives them.
- Staged post-review snapshot: 22 files, 2,194 insertions / 657 deletions, including lockfile and generated Bun dependency patch. The patch's blank context lines carry required unified-diff space prefixes; whitespace checks exclude that generated patch, not application files.

## CI follow-up

- S2 / should / resolved: initial PR advisory Web E2E failed all journeys before sign-in. Router 58 no longer injects assets into the old custom HTML automatically; forwarding document-context attributes/head/body nodes fixes hydration. Local browser sign-in proof and a document component regression cover the fix; authenticated CI journey acceptance must rerun on the new head.

## Round 3

- Reviewer: GPT 6.1 Sol, Codex provider, medium reasoning. Usage not returned.
- Verdict: APPROVE, code review only. S2 resolved; S1 not reopened; no new findings (S3).
- Confirmed Router's installed document-context contract, asset/attribute/children regression, matching scratch source, static export assets, 56 suites / 2,141 tests and typecheck evidence.
- Updated-head web CI, final-binary native launch and authenticated athlete/coach/reorder acceptance remain incomplete. Approval does not lift merge/EAS/workflow-change or device-input holds.
