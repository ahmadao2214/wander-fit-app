# Expo 58 Sol review ledger

Scope: `git diff 09fedf6ff21bafa5fbbeffb07e3dc1ddfad74720` plus untracked files. Only upgrade compatibility, regression assets and evidence documentation; production workflows and Explore work are excluded.

Current status: historical entries retain their then-current acceptance limits. Since round 4, all three CI checks passed on `2585a1a`. Azhar authorized local validation, resuming device input, and the existing merge-triggered EAS/TestFlight build; no workflow change is requested. A clean local ad-hoc signed Release fixes the simulator-only SecureStore entitlement issue without product auth changes. Authenticated athlete/detail/execution/queue-reorder-persistence/training-science and legacy coach roster/draft smoke now have direct device proof. Native testing exposed S5 below; round 5 approves its fix with no new findings. Latest-head CI remains required. No full coach assignment/submission, Android native or distribution acceptance is claimed. Evidence and the unrelated existing order-index follow-up are in `EXPO_58_UPGRADE.md`.

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

## Navigation-state follow-up / round 4 scope

- S4 / should / resolved: advisory CI on `034b019` passes sign-in/sign-up, then activation renders its error boundary after sport selection. `useSwipeNavigation` reads the external React Navigation focus context instead of Router 58's route-state context. Use Router's public `useIsFocused` export, and migrate the root theme exports to the same Router context family.
- Budget extension: round 4 is permitted by the state/concurrency exception, not a generic visual-polish review. The observed activation crash and failing-before focus-context regression establish a should-fix navigation-state integration defect. Scope is this behavior delta and S4 only; previous findings stay resolved.
- Regression using Router's actual focus provider/hook fails with the original import (`Couldn't find a navigation object`) and passes with the fix (`tests-navigation-before.log`, focused after run). Full fixed suite: 57 suites / 2,142 tests; typecheck passes (`tests-navigation-full.log`, `typecheck-navigation.log`).
- Activation's Maestro flow and feature map retain the training-overview checkpoint and explicitly reject the error boundary. Updated-head CI journey acceptance remains pending. Device operations remain stopped; authenticated native journeys and final-config launch remain incomplete. Merge/EAS/workflow changes remain held.

## Round 4

- Reviewer: GPT 6.1 Sol, Codex provider, medium reasoning. Usage not returned.
- Verdict: APPROVE, code review only. S4 resolved; S1 and S2 remain resolved; no new blocker, should-fix or nit findings.
- Independently confirmed the installed Router focus/theme exports and the actual-provider regression in scratch, with failing-before evidence. Reviewed 57 suites / 2,142 tests, typecheck and 21 flow guards passing.
- Updated-head CI activation, final-config native launch and authenticated athlete/coach/reorder acceptance remain incomplete. Approval does not lift merge, EAS, workflow-change or device-operation holds.

## Hidden-tab follow-up / round 5 scope

- S5 / should / resolved: Router 58 converts `href: null` to `hidden: true`; `useVisibleTabsWithRedirect` replaces navigation to workout/training-science with Today. Native Start Workout and program-card navigation reproduced the redirect, not a failed tap. Keep those destinations declared, using `tabBarButton: () => null` and `tabBarItemStyle: { display: 'none' }` instead of `href: null`.
- This fifth round uses the navigation-state exception: a directly reproduced should-fix routing-state regression remains in scope. Rounds 1–4 findings stay resolved. No new unrelated product functionality is added.
- Both layout regressions fail on the original options and pass with the fix; 58 suites / 2,144 tests and typecheck pass (`tests-tabs-before.log`, `tests-tabs-after.log`, `tests-tabs-full.log`, `typecheck-tabs.log`).
- Clean final-configuration Release build succeeds (`build-tabs-signed.log`). Direct native proof now covers Start Workout reaching detail, detail drag, execution, queue drag/selection and order persistence after relaunch, Profile → Training Science, and a separate test coach's roster/builder/draft. Screenshots are indexed in the upgrade document. No live input recording or auth payload is in evidence.
- An unrelated pre-existing detail-to-execution relative-index mismatch is documented, not fixed: main's unchanged detail start passes main-list-relative indices while execution expects template-relative ones. Detail drag/crash proof and execution queue persistence are separate observations, not full order-transfer acceptance.

## Round 5

- Reviewer: GPT 6.1 Sol, Codex provider, medium reasoning. Usage not returned.
- Verdict: APPROVE. S5 resolved; no new S6+ findings. S1, S2 and S4 remain closed.
- Independently confirmed the installed Router redirect mechanism and reran both layout regressions successfully. Reviewed 58 suites / 2,144 tests, typecheck, 21 flow guards, Doctor 20/20 and signed Release build evidence.
- Latest-head CI remains required before normal protected merge. Android native, distribution and full detail-to-execution order-transfer correctness remain unproven as documented.
