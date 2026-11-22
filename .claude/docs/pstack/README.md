# pstack, vendored for T3 Code

Two skills from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan (MIT, see `LICENSE` here) live in this repo so that Claude Code and Codex agents in T3 Code can use them with no install:

| Path | What it is |
| --- | --- |
| `.claude/skills/create-verification-skill/` | Generates a project-local `verify-<app>` skill and feature map. |
| `.claude/skills/maintain-verification-skill/` | The upkeep pass that keeps that skill and map honest. |
| `.claude/docs/harness/claude-code.md` | pstack's Claude Code adapter, which both skills tell the agent to read first. It maps Cursor names (`.cursor/skills/`, `Task`, cloud agents) to Claude Code. |

The files are copied unchanged from pstack's own generated Claude Code tree, `harness/pstack/claude-code/` in `cursor/plugins`, version 0.15.43, commit `3fa33bb0f927bea2ccacd48a3cfda95145fb6bae`. The only addition is one HTML comment under each skill's frontmatter naming the source. They keep their relative layout (`skills/<name>/SKILL.md` and `docs/harness/claude-code.md` under `.claude/`), so the adapter link inside each skill resolves, and `<pstack>` in the adapter means `.claude/`.

Nothing is installed globally and no user-level config changes. In Claude Code, the skills are `/create-verification-skill` and `/maintain-verification-skill` (project skills have no `pstack:` prefix). Both set `disable-model-invocation: true`, as upstream does, so an agent runs them only when asked. Codex discovers them through the `.agents/skills/` symlinks; a Codex agent can also read the `SKILL.md` directly.

## What was generated

`.claude/skills/verify-wander-fit/` is the output of `create-verification-skill` for this repo: `SKILL.md` (Launch, Doctor, Drive, Evidence, Cleanup) and `features/` (one file per `.maestro/web/` flow, plus the native-only features). It is the one copy. `.cursor/skills/verify-wander-fit` and `.agents/skills/verify-wander-fit` are symlinks to it, so Cursor, Claude Code and Codex read the same files. `scripts/verify/feature-map.test.mjs` fails when a web flow has no feature file, a file breaks the four-section format, or a symlink stops resolving.

## Updating from upstream

```bash
git clone --depth 1 https://github.com/cursor/plugins.git /tmp/cursor-plugins
diff -r /tmp/cursor-plugins/harness/pstack/claude-code/skills/create-verification-skill .claude/skills/create-verification-skill
diff -r /tmp/cursor-plugins/harness/pstack/claude-code/skills/maintain-verification-skill .claude/skills/maintain-verification-skill
diff /tmp/cursor-plugins/harness/pstack/claude-code/docs/harness/claude-code.md .claude/docs/harness/claude-code.md
```

Copy the changed files over, keep the provenance comment, update the version and commit above, and update `LICENSE` if it changed.

## Nightly maintenance

A nightly run of `/maintain-verification-skill` keeps the map in step with the app. It ends one of three ways: **clean** (no PR), **changed** (one PR of feature-map or harness corrections), or **blocked** (a report of what stopped it). By the skill's edit scope it touches only `.claude/skills/verify-wander-fit/` and the harness it owns, never product code. Product regressions it finds go in its report, not the PR.

It runs as a T3 Code scheduled task on the founder's Mac, because that machine has the env files, Maestro, Java and Chrome, and needs no new CI secrets. The task is named "Nightly verify-map maintenance" and was created **paused**; switch it on once this skill is on `main`. Its prompt:

```text
/maintain-verification-skill

Target: .claude/skills/verify-wander-fit/ (the only verification skill in this repo).

Setup, before step 0:
- Work in a new git worktree of origin/main on a branch named verify-map/<YYYY-MM-DD>; never edit the main checkout or another agent's branch.
- Symlink .env, .env.e2e and .env.local from the main checkout into the worktree. Never commit them.
- Run `bun install --frozen-lockfile`. Never regenerate bun.lock.
- Export VERIFY_PORT=4373 and VERIFY_STATE_FILE, VERIFY_READY_FILE, VERIFY_LOG_FILE under $TMPDIR/verify-nightly/, so you never touch another run's server.

Rules:
- Never edit product code (app/, components/, convex/, lib/, hooks/). Edit scope is the verification skill directory and scripts/verify/.
- Don't run `node scripts/verify/run.mjs deploy`, EAS builds, cloud simulators, the iOS Simulator or an Android emulator. Native-only features are verified-unreachable with that prerequisite.
- Never print persona passwords or secrets. Run `node scripts/verify/run.mjs teardown` after every failed drive and at the end.
- Before shipping a PR, `bun run test:ci` and `bun run typecheck` must pass.

Finish with exactly one outcome: clean (no branch, no PR), changed (one non-draft PR against main titled "Verify map: <date> corrections", listing the features covered and the proof), or blocked (say what blocked it). Report product gaps separately; keep them out of the PR.
```

To recreate it from any T3 Code thread, call `schedule_task` with that prompt, `schedule: { type: "fixed_time", timeOfDay: "03:00" }`, `bindToCurrentThread: false`, `freshSession: true`.

Each run costs one agent session and roughly one full web suite (about 10 minutes of Maestro), plus the E2E backend calls; it opens at most one PR.
