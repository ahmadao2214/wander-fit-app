# T3 Code: setup and contribution plan

T3 Code is the planned home for future Claude Code and Codex sessions. This page says what it is, how to set it up on a Mac, how existing sessions come across, and a plan for contributing to it.

**Sources:** [pingdotgg/t3code](https://github.com/pingdotgg/t3code) at [`becf853`](https://github.com/pingdotgg/t3code/commit/becf853defb6127dbe4447860383777d69346b6f) (2026-10-26), its `README.md`, `CONTRIBUTING.md` and `docs/user/*`, the importer source, and its public issues. Codex facts come from [openai/codex](https://github.com/openai/codex) at `ce7adb6` (2026-10-27). tstack's README links T3 Code as `github.com/pingdotgg/t3code`; that link is how the official repo was identified.

## What it is

T3 Code is an open-source (MIT) "agent harness control surface". It is not a harness itself (see its [FAQ](https://github.com/pingdotgg/t3code/blob/main/docs/user/faq.md)). It drives the coding agents already installed and signed in on a machine, and you control them from a desktop app (Electron), a web app, or iOS and Android apps.

- **Agents:** Claude Code, Codex, Cursor, Grok Build, OpenCode, Google Antigravity, Pi and Muse Code. Both of ours are supported.
- **How it runs them:**
  - A local server (`t3`) owns projects, threads and worktrees.
  - Claude runs through Anthropic's Agent SDK. Codex runs through the Codex App Server, or a managed runtime when you connect with ChatGPT. Most others run over ACP.
  - Your code and prompts go from your machine to the provider, not to T3. It does send product usage events; `T3CODE_TELEMETRY_ENABLED=false` turns them off.
- **What it needs:**
  - At least one provider CLI on the server's `PATH`, signed in: `claude auth login` and `codex login`.
  - `git`, and `gh` for GitHub features.
  - No Node: the `t3` binary is self-contained.
- **Remote:** `t3 connect` (T3 Connect, a Cloudflare tunnel, free for up to 3 machines), LAN pairing, or Tailscale. The phone app is a remote; the computer does the work.
- **Cost caveat from its FAQ:** Agent SDK usage drains Claude's 5-hour limit faster than Claude Code does directly. Weekly limits aren't affected. Watch this on a Max plan.
- **Mobile app:** Expo 58 and React Native 0.88 (`apps/mobile`). That matters for contributing.

## Set up on your Mac

These steps assume an Apple Silicon Mac. **Intel Macs have no `t3` binary.** Use the desktop app there, or build the server from source (step 2b). Nothing here was installed on your machine. The checks this container could run are listed at the end.

1. **Make sure both agents work in a terminal first.**
   ```bash
   claude --version && claude auth login     # Claude Code
   codex --version  && codex login           # Codex (or skip and use "Connect with ChatGPT" in step 4)
   gh auth status                            # GitHub CLI, for PR features
   ```
2. **Install T3 Code.** Pick one:
   - **a. Desktop app (recommended):** `brew install --cask t3-code`, then open **T3 Code**. To get the `t3` command too, go to **Settings → About → t3 command → Install**.
   - **b. CLI only:** `curl -fsSL https://t3.codes/install.sh | sh`. It installs into `~/.t3/runtime` and links `t3` into `~/.local/bin`; add that to `PATH` if the installer says so. Then run `t3` to start the server and open the web app. `T3CODE_CHANNEL=nightly` picks the nightly train.
   - **Intel Mac server:** install `vp` (`curl -fsSL https://vite.plus | bash`), then `git clone https://github.com/pingdotgg/t3code && cd t3code && vp i && vp run build:desktop && node apps/server/dist/bin.mjs`.
3. **Run the Welcome wizard.** It selects this Mac, checks for Claude Code and Codex, and offers to import projects (see the next section). Pick `wander-fit-app`.
4. **Providers.** Open **Settings → Providers**:
   - Enable Claude and Codex.
   - If a CLI isn't found, which is common with `nvm`, set its **Binary path**.
   - For a second Claude account, add an instance with its own `CLAUDE_CONFIG_DIR` (see [providers-claude.md](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md)).
5. **Project settings.** In **Settings → Storage**, turn on automatic worktree cleanup; worktrees pile up. Choose a permission mode ([permission-modes.md](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md)).
6. **Keep it running (optional).** Run `t3 service install` so your phone can reach the Mac. Then install the iOS app and pair it with `t3 connect`.
7. **Skills.** T3 Code runs the agents' own CLIs, so Claude Code still loads `CLAUDE.md`, the Matt plugin and any project skills. tstack's `council` and `sol-loop` become usable here: T3's `delegate_task` can start a GPT or Gemini reviewer, which Claude Code alone can't.
8. **Outside agents (optional).** **Settings → Environments → Copy MCP URL** lets a Claude Code session in your own terminal read and start T3 threads over MCP.

**Checked from this container:**

- Read `install.sh` without running it. It needs `curl` or `wget` plus `shasum`, supports macOS and Linux on arm64 and x64, and verifies a SHA-256 checksum before unpacking.
- Running the CLI (`npx t3@latest --help`) was blocked by this sandbox's policy on running outside code, so the app itself was not started here.

## Bringing existing sessions in

**Yes, import exists, and imported threads resume natively.** The Welcome wizard's *Import your projects* step scans both agents' transcript folders, groups conversations by working directory and git remote, and imports them as threads. To run it again later, open `/welcome`.

### Where the transcripts live

| Agent | Location | Format |
|---|---|---|
| **Claude Code** | `~/.claude/projects/<slug>/<session-uuid>.jsonl`, or under `$CLAUDE_CONFIG_DIR`. `<slug>` is the working directory with each `/` and `.` turned into `-`. | JSONL. Each record has `type` (`user`, `assistant`, `attachment`, `queue-operation`, …), `sessionId` and `cwd`. This was checked against this session's own transcript at `~/.claude/projects/-home-user-wander-fit-app/`. |
| **Codex** | `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl`, with `$CODEX_HOME` defaulting to `~/.codex`. Archived sessions go to `$CODEX_HOME/archived_sessions/`. Codex compresses older rollouts to `.jsonl.zst`. | JSONL. The first record is `session_meta` (with `cwd`), then response items. Source: `codex-rs/rollout/src/lib.rs` and `compression.rs`. |

### What the importer does

Source: `apps/server/src/project/AgentSessionScanner.ts` and `AgentSessionImporter.ts`, plus [welcome-wizard.md](https://github.com/pingdotgg/t3code/blob/main/docs/user/welcome-wizard.md).

- **Scope.** Conversations active in the last **30 days**. Each one keeps its first user prompt plus the newest visible messages, up to **200 messages**. Tool activity and attachments are dropped. Each attempt reads up to 100 files and 4 GiB per project; run it again for more.
- **Resume, not replay.** Each imported thread stores the native session ID as its resume cursor: `{ threadId: <codex id> }` for Codex, and `{ resume: <claude session uuid> }` for Claude. Your next message continues the real provider session; it doesn't paste a summary. A Claude session whose ID isn't a UUID is refused as unresumable.
- **Provider switches** within a thread use a separate mechanism, *portable handoffs*. That is a budgeted selection of recent messages (16k tokens by default), not native context.

### Gaps that affect you

1. **Cloud sessions aren't on your Mac.** Claude Code on the web, including this session, writes its transcript inside the cloud container, not to your `~/.claude/projects`. T3's importer only sees local files. To continue a cloud session in T3, bring the work across with a pushed branch and a `/handoff` doc, or check whether your Claude Code version can pull a web session to your machine.
2. **Compressed Codex rollouts are skipped.** [#21755](https://github.com/pingdotgg/t3code/issues/21755) is accepted and was reproduced by a maintainer on 2026-10-21. No PR is open.
3. **`archived_sessions/` isn't scanned.** The scanner reads only `sessions/`. [#7090](https://github.com/pingdotgg/t3code/issues/7090) reports the same gap for the Usage page, but no issue covers import.
4. **The 30-day window is intended.** The maintainer asked for an Ideas discussion before anyone changes it.

There's no need to build an importer from scratch. The useful work is fixing these gaps in the existing one.

## Contributing

### The rules (from `CONTRIBUTING.md`)

- The project says plainly that it is **not seeking outside contributions** and has limited review capacity.
- Focused bug fixes, reliability, performance and maintenance work are the most likely to land. Unsolicited features, rewrites and cleanup are not.
- **Features need prior approval.** Get explicit maintainer sign-off on direction and scope in an [Ideas discussion](https://github.com/pingdotgg/t3code/discussions/categories/ideas), and link that approval in the PR. A linked issue alone isn't enough.
- **A substantial bug fix links a triaged issue.** Look for the labels `accepted` and `bug`, often `via-triage`, which means it was filed through `npx t3 triage`. A tiny, obvious fix may skip the issue if you explain why it qualifies.
- **One underlying problem per PR.** Split anything else.
- **Evidence is required.**
  - Repro steps, focused test commands, and what you observed.
  - Before/after screenshots for UI, and a recording when motion matters.
  - "Tests pass" alone gets closed.
- **Model rule.** PRs whose stated author model is any Gemini or Muse Wonder are closed. Claude and Codex are fine. The PR should name the model and harness, usually in a closing attribution line.
- **Triage is automated.** A triage agent checks each PR against the guide. PRs get `vouch:*` and `size:*` labels. Macroscope reviews after triage. Maintainers land PRs with a `land` label.

Setup: install `vp`, then `vp i` and `vp run dev`. Open the pairing URL it prints. The repo ships agent skills you should read first: `.claude/skills/test-t3-app`, `test-t3-mobile` and `contribution-triage`.

### Labels worth knowing

| Label | Meaning |
|---|---|
| `accepted` + `bug` | Approved to fix |
| `via-triage` | Filed through `npx t3 triage` |
| `needs-triage`, `needs more info` | Not yet approved |
| `good first issue` | Only one is open (#13406), and a maintainer PR already covers it |
| `vouch:unvouched`, `vouch:trusted` | Your PR status |
| `pr:needs-verification` | Waiting for a run on a real device |
| `size:XS`…`XXL` | Diff size |

### First contributions, in order

| # | Issue | Why it fits | Size |
|---|---|---|---|
| 1 | [#21755](https://github.com/pingdotgg/t3code/issues/21755): session import ignores `.jsonl.zst` Codex rollouts | Your own need (importing old sessions). Accepted, reproduced by a maintainer, no PR. The maintainer already confirmed two scanner tests fail, so the evidence is easy: a fixture test plus a before/after Projects screenshot. One problem: discover `.jsonl.zst` files and decompress while reading (Codex's own `compression.rs` shows the format). Check whether the pinned Node 26 `zlib` has zstd built in before adding a dependency. Leave the 30-day window alone. | S–M |
| 2 | New issue: import skips Codex `archived_sessions/` | Same file, same skills. File it first with a repro and point at #7090, then fix it once it's accepted. Asking before filing, per this repo's rules. | S |
| 3 | [#12754](https://github.com/pingdotgg/t3code/issues/12754): Android scroll-to-bottom arrow shows when already at the bottom | Your React Native strength. `accepted`, `bug`. A screen recording is the evidence. | S |
| 4 | [#22543](https://github.com/pingdotgg/t3code/issues/22543): iPad sidebar hides the newest thread under the header (iPadOS 18) | React Native safe-area and layout, the same as our `AGENTS.md` safe-area rule. Accepted. Needs an iPad simulator. | S–M |
| 5 | [#13925](https://github.com/pingdotgg/t3code/issues/13925): Android scrolling a long, settled thread is janky | A deeper React Native list-performance problem; use pstack's `benchmark-checklist` habits for numbers. Take it after 1–3 have landed. | M–L |

Before starting any of them, check the issue's comments and search open PRs (on GitHub and the git.cafe mirror) so you don't duplicate work, as happened with #13406. If you want an assignment, comment on the issue. That's an outward action, so do it yourself.

### Path from a first PR to steady contribution

1. **Use it daily first** (weeks 1–2). Run Wander-Fit work in T3 Code. File the friction you hit through `npx t3 triage`; that's how most accepted issues arrive.
2. **First PR** (week 2–3). #21755, small and fully evidenced, following `CONTRIBUTING.md` to the letter. Expect `vouch:unvouched` and automated triage.
3. **Second and third PRs in the same area.** Archived sessions, then any import bug you hit (#24067 on Windows and #23727 on symlinked homes are the same subsystem). Owning one subsystem builds trust faster than spreading out.
4. **The mobile lane.** Android and iOS bugs, where your Expo experience is rare among contributors. Device-verified evidence is what `pr:needs-verification` waits for.
5. **Proposals.** Once a few PRs have landed, take an idea such as a user-selectable import window, or "import more history" in Settings, to an Ideas discussion with data from your own use. Build it only after explicit approval.
6. **Tell the story.** For a frontier-lab application, the strongest evidence is: merged PRs in a harness-adjacent codebase, each with a clear problem, a reproduction and proof, plus a short write-up of one non-trivial fix. Keep a running log of each PR's problem, approach and evidence.

## Decisions waiting on you

- **Mac type:** Apple Silicon or Intel? The setup path changes on Intel.
- **This file's home:** it sits beside the skills playbook because the two share a commit. If your T3 Code notes and contribution log grow, move them to a personal repo (for example `t3code-notes`) and keep only setup notes here.
- **Filing the `archived_sessions` issue** or commenting on #21755: say the word and I'll draft the text; you post it.
