import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import {
  artifactName,
  balanceShards,
  defaultFlows,
  evidenceDirFor,
  listWebFlows,
  nightlyOnlyFlows,
  personaMode,
  root,
  selectAffectedFlows,
} from './flows.mjs'
import { loadMergedResults, renderSummary } from './summary.mjs'

const checks = parse(fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8'))
const runWorkflow = parse(
  fs.readFileSync(path.join(root, '.github/workflows/web-e2e-run.yml'), 'utf8')
)
const planJob = checks.jobs['e2e-plan']
const runCallerJob = checks.jobs['e2e-run']
const buildJob = runWorkflow.jobs['e2e-build']
const shardJob = runWorkflow.jobs['e2e-shard']
const job = checks.jobs['web-e2e']

function expandFlow(file, seen = new Set()) {
  const full = path.resolve(file)
  if (seen.has(full)) throw new Error(`runFlow cycle at ${full}`)
  seen.add(full)
  const text = fs.readFileSync(full, 'utf8')
  return text.replace(/runFlow:\s*(\S+\.yaml)/g, (_, relative) => {
    return expandFlow(path.resolve(path.dirname(full), relative), seen)
  })
}

describe('web flows', () => {
  it('lists the entry files directly under the folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-flows-'))
    try {
      fs.writeFileSync(path.join(dir, 'sign-up.yaml'), '')
      fs.writeFileSync(path.join(dir, 'sign-in.yaml'), '')
      fs.writeFileSync(path.join(dir, 'notes.md'), '')
      fs.mkdirSync(path.join(dir, 'shared'))
      fs.writeFileSync(path.join(dir, 'shared/login.yaml'), '')
      expect(listWebFlows(dir)).toEqual(['sign-in', 'sign-up'])
      expect(listWebFlows(path.join(dir, 'missing'))).toEqual([])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('includes sign-in and the First Run, and no longer sign-up or activation', () => {
    expect(listWebFlows()).toContain('sign-in')
    expect(listWebFlows()).toContain('first-run')
    expect(listWebFlows()).not.toContain('sign-up')
    expect(listWebFlows()).not.toContain('activation')
    expect(listWebFlows()).toContain('history')
    expect(listWebFlows()).toContain('workout-exit-resume')
  })

  it('keeps launch on the web entry and a parseable header on the shared files', () => {
    const entry = fs.readFileSync(path.join(root, '.maestro/web/sign-in.yaml'), 'utf8')
    expect(entry.startsWith('url: ${VERIFY_URL}\n')).toBe(true)
    expect(entry).toContain('launchApp:')
    expect(entry.indexOf('launchApp:')).toBeLessThan(
      entry.indexOf('runFlow: ../journeys/sign-in.yaml')
    )
    expect(entry).not.toContain('appId:')
    expect(entry).not.toContain('inputText:')
    const shared = [
      '.maestro/journeys/sign-in.yaml',
      '.maestro/subflows/_sign-in.yaml',
      '.maestro/subflows/_evidence-start.yaml',
      '.maestro/subflows/_evidence-stop.yaml',
    ]
    for (const file of shared) {
      const text = fs.readFileSync(path.join(root, file), 'utf8')
      expect(text).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
      expect(text).not.toMatch(/^appId:/m)
      expect(text).not.toContain('launchApp')
      expect(text).not.toMatch(/^env:/m)
    }
    const notes = fs.readFileSync(path.join(root, '.maestro/flow-layout.md'), 'utf8')
    expect(notes).toContain('matches a React Native Web `testID` with `id:`')
    expect(notes).toContain('copies the header of the file that contains `launchApp`')
    expect(notes).toContain('left Chromium at `data:,`')
  })

  it('records sign-in through Profile sign-out', () => {
    const flow = expandFlow(path.join(root, '.maestro/web/sign-in.yaml'))
    const screen = fs.readFileSync(path.join(root, 'app/(athlete)/index.tsx'), 'utf8')
    const signOutButton = fs.readFileSync(path.join(root, 'components/SignOutButton.tsx'), 'utf8')
    const signOutScroll = fs.readFileSync(path.join(root, 'lib/signOutScroll.ts'), 'utf8')
    expect(screen).toContain('testID="today-workout-card"')
    expect(screen).toContain('testID="today-heading"')
    expect(signOutButton).toContain('nativeID="sign-out"')
    expect(signOutButton).toContain('hashchange')
    expect(signOutButton).toContain('noteUserScroll')
    expect(signOutScroll).toContain('scrollTop')
    const start = flow.indexOf('startRecording: recording')
    const welcome = flow.indexOf('id: today-heading')
    const today = flow.indexOf('assertVisible: "Today"')
    const card = flow.indexOf('id: today-workout-card')
    const workout = flow.indexOf('assertVisible: "Start Workout"')
    const shot = flow.indexOf('takeScreenshot: 03-today')
    const signOut = flow.indexOf('profile#sign-out')
    const signOutLabel = flow.indexOf('visible: "Sign Out"')
    const profileShot = flow.indexOf('takeScreenshot: 04-profile')
    const signedOut = flow.lastIndexOf(`visible: "Let's build your plan for this season."`)
    const stop = flow.lastIndexOf('stopRecording')
    expect(start).toBeGreaterThan(flow.indexOf('launchApp'))
    expect(today).toBeGreaterThan(welcome)
    expect(card).toBeGreaterThan(today)
    expect(workout).toBeGreaterThan(card)
    expect(shot).toBeGreaterThan(workout)
    expect(signOut).toBeGreaterThan(shot)
    expect(signOutLabel).toBeGreaterThan(signOut)
    expect(profileShot).toBeGreaterThan(signOutLabel)
    expect(signedOut).toBeGreaterThan(profileShot)
    expect(stop).toBeGreaterThan(flow.indexOf('takeScreenshot: 05-signed-out'))
  })

  it('keeps the First Run entry thin and its journey launch-free', () => {
    const entry = fs.readFileSync(path.join(root, '.maestro/web/first-run.yaml'), 'utf8')
    expect(entry.startsWith('url: ${VERIFY_URL}\n')).toBe(true)
    expect(entry).toContain('clearState: true')
    expect(entry.indexOf('launchApp:')).toBeGreaterThan(-1)
    expect(entry.indexOf('launchApp:')).toBeLessThan(
      entry.indexOf('runFlow: ../journeys/first-run.yaml')
    )
    expect(entry).not.toContain('appId:')
    expect(entry).not.toContain('inputText:')
    const journey = fs.readFileSync(path.join(root, '.maestro/journeys/first-run.yaml'), 'utf8')
    expect(journey).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
    expect(journey).not.toMatch(/^appId:/m)
    expect(journey).not.toContain('launchApp')
    expect(journey).not.toMatch(/^env:/m)
  })

  it('records the First Run from the promise through sign-up to the Program tab', () => {
    const flow = expandFlow(path.join(root, '.maestro/web/first-run.yaml'))
    const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
    const screens = [
      read('app/(first-run)/index.tsx'),
      read('app/(first-run)/sport.tsx'),
      read('app/(first-run)/season.tsx'),
      read('app/(first-run)/days.tsx'),
      read('app/(first-run)/about.tsx'),
      read('app/(first-run)/reveal.tsx'),
      read('components/first-run/IntakeFrame.tsx'),
      read('components/first-run/PlanView.tsx'),
      read('components/first-run/SavePlanSheet.tsx'),
      read('components/program/ProgramSeasonHeader.tsx'),
    ].join('\n')
    // Every testID the journey taps exists in the screens. (Quoted ids are
    // accessibility labels, which Maestro web reports as the id.)
    const ids = [...flow.matchAll(/id: ([a-z0-9-]+)$/gim)].map((m) => m[1])
    const missing = [...new Set(ids)].filter((id) => !screens.includes(id))
    expect(missing).toEqual([])
    const order = [
      'startRecording: recording',
      `visible: "LET'S BUILD YOUR PLAN FOR THIS SEASON."`,
      'assertNotVisible: "WELCOME BACK"',
      'id: "Basketball"',
      'tapOn: "No set season"',
      'visible: "3 SESSIONS A WEEK"',
      'tapOn: "Performance"',
      'tapOn: "New to training"',
      'visible: "BASKETBALL PLAN"',
      'id: "Power. See your category again"',
      'visible: "BASKETBALL TRAINS FOR"',
      'tapOn: "Tap to go back to your plan"',
      'Lower Body A',
      'id: first-run-save',
      'id: save-plan-email',
      'assertNotVisible: "Skip"',
      'inputText: "Verify Athlete"',
      'inputText: ${PERSONA_EMAIL}',
      'inputText: ${PERSONA_PASSWORD}',
      'id: save-plan-create',
      'visible: "Check your email"',
      'inputText: "424242"',
      'visible: "Up next · .*"',
      'assertNotVisible: "WARMUP"',
      'takeScreenshot: 09-program',
      'stopRecording',
    ]
    // Jest's expect takes no message, so failures name the steps in the diff.
    expect(order.filter((needle) => !flow.includes(needle))).toEqual([])
    const positions = order.map((needle) => flow.indexOf(needle))
    const outOfOrder = order.filter((needle, i) => i > 0 && positions[i] <= positions[i - 1])
    expect(outOfOrder).toEqual([])
    expect(flow.indexOf('launchApp')).toBeLessThan(positions[0])
  })

  it('has an upload step in the checks workflow for every web flow', () => {
    const uploads = shardJob.steps
      .filter((step) => String(step.uses || '').startsWith('actions/upload-artifact@'))
      .map((step) => ({ name: step.with.name, path: step.with.path, if: step.if }))
    for (const flow of listWebFlows()) {
      const evidence = `${path.relative(root, evidenceDirFor(flow))}/`
      const expected = {
        name: artifactName(flow),
        path: evidence,
        if: `always() && hashFiles('${evidence}.scrubbed') != ''`,
      }
      // A missing step shows up as this flow's expected entry in the diff.
      expect(uploads).toContainEqual(expected)
    }
  })
})

describe('web E2E job', () => {
  it('plans, holds the backend lock across build and parallel shards, summarizes under Web E2E (advisory), and does not cancel main', () => {
    expect(checks.concurrency['cancel-in-progress']).toBe(
      "${{ github.event_name == 'pull_request' }}"
    )
    expect(planJob.outputs).toMatchObject({
      mode: '${{ steps.plan.outputs.mode }}',
      run_e2e: '${{ steps.plan.outputs.run_e2e }}',
      shards: '${{ steps.plan.outputs.shards }}',
    })
    expect(JSON.stringify(planJob)).not.toContain('secrets.')

    // Concurrency lives on the reusable-workflow caller job so the lock spans
    // both e2e-build and every parallel e2e-shard without serializing shards
    // of the same run against each other.
    expect(runCallerJob.needs).toBe('e2e-plan')
    expect(runCallerJob.uses).toBe('./.github/workflows/web-e2e-run.yml')
    expect(runCallerJob.concurrency).toEqual({
      group:
        "${{ needs.e2e-plan.outputs.mode == 'preview' && format('e2e-preview-pr-{0}', github.event.pull_request.number) || 'e2e-backend' }}",
      'cancel-in-progress': false,
      queue: 'max',
    })
    expect(runWorkflow.concurrency).toBeUndefined()
    expect(buildJob.concurrency).toBeUndefined()
    expect(shardJob.concurrency).toBeUndefined()

    expect(shardJob.needs).toBe('e2e-build')
    expect(shardJob.strategy['fail-fast']).toBe(false)
    expect(shardJob.strategy.matrix.shard).toBe('${{ fromJson(inputs.shards) }}')

    expect(job.name).toBe('Web E2E (advisory)')
    expect(job.needs).toEqual(['e2e-plan', 'e2e-run'])
  })

  it('passes only the key each step needs across build and shard jobs', () => {
    const callerPreviewName =
      "${{ needs.e2e-plan.outputs.mode == 'preview' && format('pr-{0}', github.event.pull_request.number) || '' }}"
    expect(runCallerJob.with.preview_name).toBe(callerPreviewName)
    expect(runCallerJob.secrets).toEqual({
      CLERK_SECRET_KEY: '${{ secrets.CLERK_SECRET_KEY }}',
      CONVEX_DEPLOY_KEY_E2E: '${{ secrets.CONVEX_DEPLOY_KEY_E2E }}',
      CONVEX_PREVIEW_DEPLOY_KEY_E2E: '${{ secrets.CONVEX_PREVIEW_DEPLOY_KEY_E2E }}',
    })

    const previewOnly =
      "${{ inputs.mode == 'preview' && secrets.CONVEX_PREVIEW_DEPLOY_KEY_E2E || '' }}"
    const nonPreviewDev = "${{ inputs.mode != 'preview' && secrets.CONVEX_DEPLOY_KEY_E2E || '' }}"

    const deploy = buildJob.steps.find((step) => (step.run || '').endsWith('run.mjs deploy'))
    expect(deploy.id).toBe('backend')
    expect(deploy.env.VERIFY_BACKEND_MODE).toBe('${{ inputs.mode }}')
    expect(deploy.env.EXPO_PUBLIC_CONVEX_URL_E2E).toBe('${{ vars.EXPO_PUBLIC_CONVEX_URL_E2E }}')
    expect(deploy.env.CONVEX_DEPLOY_KEY_E2E).toBe(nonPreviewDev)
    expect(deploy.env.CONVEX_PREVIEW_DEPLOY_KEY_E2E).toBe(previewOnly)
    expect(deploy.env.CONVEX_PREVIEW_NAME_E2E).toBe('${{ inputs.preview_name }}')

    const exportStep = buildJob.steps.find((step) => (step.run || '').endsWith('run.mjs export'))
    expect(exportStep.env.EXPO_PUBLIC_CONVEX_URL_E2E).toBe(
      '${{ steps.backend.outputs.convex_url }}'
    )

    const shardSteps = shardJob.steps.filter((step) =>
      /run\.mjs (all\b|teardown$)/.test(step.run || '')
    )
    expect(shardSteps.length).toBe(2)
    for (const step of shardSteps) {
      expect(step.env.EXPO_PUBLIC_CONVEX_URL_E2E).toBe('${{ needs.e2e-build.outputs.convex_url }}')
      expect(step.env.CONVEX_DEPLOY_KEY_E2E).toBe(nonPreviewDev)
      expect(step.env.CONVEX_PREVIEW_DEPLOY_KEY_E2E).toBe(previewOnly)
      expect(step.env.CONVEX_PREVIEW_NAME_E2E).toBe('${{ inputs.preview_name }}')
    }
    expect(buildJob.env).not.toHaveProperty('EXPO_PUBLIC_CONVEX_URL_E2E')
    expect(shardJob.env).not.toHaveProperty('EXPO_PUBLIC_CONVEX_URL_E2E')
  })

  it('is skipped on fork pull requests', () => {
    expect(planJob.if).toContain(
      'github.event.pull_request.head.repo.full_name == github.repository'
    )
    expect(job.if).toContain('github.event.pull_request.head.repo.full_name == github.repository')
  })

  it('runs on pull requests and pushes to main', () => {
    expect(checks.on).toHaveProperty('pull_request')
    expect(checks.on.push.branches).toEqual(['main'])
  })

  it('deploys and exports in build, downloads and tears down before uploading in shards, and summarizes last', () => {
    const buildRuns = buildJob.steps.map((step) => step.run || step.uses || '')
    expect(buildRuns.findIndex((r) => r.includes('run.mjs deploy'))).toBeLessThan(
      buildRuns.findIndex((r) => r.includes('run.mjs export'))
    )
    expect(buildRuns.findIndex((r) => r.includes('run.mjs export'))).toBeLessThan(
      buildRuns.findIndex((r) => r.includes('actions/upload-artifact@'))
    )

    const shardRuns = shardJob.steps.map((step) => step.run || step.uses || '')
    const index = (text) => shardRuns.findIndex((run) => run.includes(text))
    expect(index('actions/download-artifact@')).toBeLessThan(index('run.mjs all'))
    expect(index('run.mjs all')).toBeLessThan(index('run.mjs teardown'))
    expect(index('run.mjs teardown')).toBeLessThan(index('actions/upload-artifact@'))

    const summaryRuns = job.steps.map((step) => step.run || step.uses || '')
    expect(summaryRuns.some((r) => r.includes('summary.mjs'))).toBe(true)
  })

  it('keeps secrets out of the install steps', () => {
    for (const current of [planJob, buildJob, shardJob, job]) {
      expect(JSON.stringify(current.env || {})).not.toContain('secrets.')
      for (const step of current.steps) {
        const usesSecrets = JSON.stringify(step.env || {}).includes('secrets.')
        if (usesSecrets)
          expect(step.run).toMatch(/^node scripts\/verify\/run\.mjs (deploy|all\b|teardown)/)
      }
    }
  })
})

describe('summary', () => {
  it("links each flow's artifact and marks missing flows", () => {
    const markdown = renderSummary({
      flows: ['sign-in', 'sign-up'],
      results: [{ flow: 'sign-in', status: 'passed', seconds: 41, artifact: 'e2e-web-sign-in' }],
      artifacts: { 'e2e-web-sign-in': 'https://github.com/o/r/actions/runs/1/artifacts/9' },
      runUrl: 'https://github.com/o/r/actions/runs/1',
    })
    expect(markdown).toContain(
      '| sign-in | ✅ passed | 41s | [e2e-web-sign-in](https://github.com/o/r/actions/runs/1/artifacts/9) |  |'
    )
    expect(markdown).toContain('| sign-up | ⚪ not run |  | e2e-web-sign-up (not uploaded) |  |')
  })

  it('shows the error and escapes table pipes', () => {
    const markdown = renderSummary({
      flows: ['sign-in'],
      results: [{ flow: 'sign-in', status: 'failed', seconds: 3, error: 'a | b\nc' }],
      artifacts: {},
      runUrl: '',
    })
    expect(markdown).toContain(
      '| sign-in | ❌ failed | 3s | e2e-web-sign-in (not uploaded) | a \\| b c |'
    )
  })

  it('says when no flow ran', () => {
    const markdown = renderSummary({ flows: ['sign-in'], results: null, artifacts: {}, runUrl: '' })
    expect(markdown).toContain('No flow ran.')
    expect(markdown).toContain('| sign-in | ⚪ not run |')
    expect(markdown).toContain('startRecording/recording.mp4')
  })
})

describe('persona modes per flow', () => {
  it('makes the First Run account through the UI and signs in onboarded otherwise', () => {
    expect(personaMode('first-run')).toBe('first-run')
    expect(personaMode('history')).toBe('with-history')
    expect(personaMode('sign-in')).toBe('onboarded')
  })
})

describe('native reorder flow', () => {
  const flowText = fs.readFileSync(path.join(root, '.maestro/native/workout-reorder.yaml'), 'utf8')

  it('only uses testIDs that exist in the screens it drives', () => {
    const sources = [
      'app/(athlete)/index.tsx',
      'app/(athlete)/workout/[id].tsx',
      'app/(athlete)/workout/execute/[id].tsx',
      'components/workout/SetTracker.tsx',
      'components/workout/WarmupSection.tsx',
    ]
      .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
      .join('\n')
    const ids = [...new Set([...flowText.matchAll(/id: (\S+)/g)].map((m) => m[1]))]
    const missing = ids.filter((id) => {
      if (/^set-\d$/.test(id)) return !sources.includes('testID={`set-${index}`}')
      return !sources.includes(`testID="${id}"`)
    })
    expect(missing).toEqual([])
  })

  it('logs a set, restarts, resumes, and checks the set stayed on the first exercise', () => {
    const steps = parse(flowText.split(/^---$/m)[1])
    const at = (predicate) => steps.findIndex(predicate)
    const logged = at((s) => s.tapOn?.id === 'set-0')
    const exit = at((s) => s === 'stopApp')
    const resume = at((s) => s.tapOn === 'Resume Workout')
    const finalCheck = steps.length - 2
    expect([logged > 0, exit > logged, resume > exit]).toEqual([true, true, true])
    expect(steps[finalCheck].assertVisible).toBe('Set 1, .*, done')
  })
})

describe('native no-auto-advance flow', () => {
  const flowPath = path.join(root, '.maestro/native/workout-no-auto-advance.yaml')
  const flowText = fs.readFileSync(flowPath, 'utf8')

  it('parses with an appId header and does not launch', () => {
    const [header] = flowText.split(/^---$/m)
    expect(parse(header).appId).toBe('com.offseason.asrafit')
    expect(flowText).not.toContain('launchApp')
  })

  it('only uses testIDs that exist in the screens it drives', () => {
    const sources = [
      'app/(athlete)/index.tsx',
      'app/(athlete)/workout/[id].tsx',
      'app/(athlete)/workout/execute/[id].tsx',
      'components/workout/SetTracker.tsx',
      'components/workout/WarmupSection.tsx',
    ]
      .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
      .join('\n')
    const ids = [...new Set([...flowText.matchAll(/id: (\S+)/g)].map((m) => m[1]))]
    const missing = ids.filter((id) => {
      if (/^set-\d$/.test(id)) return !sources.includes('testID={`set-${index}`}')
      return !sources.includes(`testID="${id}"`)
    })
    expect(missing).toEqual([])
  })

  it('waits past the old 1.5 s delay before checking the exercise stayed', () => {
    const steps = parse(flowText.split(/^---$/m)[1])
    const wait = steps.find((s) => s.extendedWaitUntil)?.extendedWaitUntil
    expect(wait.timeout).toBeGreaterThan(1500)
    expect(wait.optional).toBe(true)
    const waitIndex = steps.findIndex((s) => s.extendedWaitUntil)
    const nextIndex = steps.findIndex((s) => s.tapOn?.id === 'execute-next')
    expect(steps[waitIndex + 1].assertVisible.text).toBe('${maestro.copiedText}')
    expect(nextIndex).toBeGreaterThan(waitIndex)
  })
})

describe('nightly-only flows', () => {
  it('leaves the nightly-only flows out of pull request runs and keeps them everywhere else', () => {
    const available = listWebFlows()
    expect(available).toContain('workout-loop')
    expect(defaultFlows(available, 'pr')).not.toContain('workout-loop')
    expect(defaultFlows(available, 'pr')).toEqual(
      available.filter((flow) => !nightlyOnlyFlows.includes(flow))
    )
    expect(defaultFlows(available, 'all')).toEqual(available)
    expect(defaultFlows(available, undefined)).toEqual(available)
  })

  it('names only flows that exist, so a rename cannot silently drop a flow from PRs', () => {
    expect(nightlyOnlyFlows.filter((flow) => !listWebFlows().includes(flow))).toEqual([])
  })

  it('plans PR runs via run.mjs plan and passes shard flows to run.mjs all', () => {
    const planStep = planJob.steps.find((s) => (s.run || '').endsWith('run.mjs plan'))
    expect(planStep).toBeDefined()
    const shardStep = shardJob.steps.find((s) => /run\.mjs all /.test(s.run || ''))
    expect(shardStep.run).toBe(
      "node scripts/verify/run.mjs all ${{ join(matrix.shard.flows, ' ') }}"
    )
  })
})

describe('sharding and affected-flow selection', () => {
  it('balances flows across shards by recorded duration', () => {
    const shards = balanceShards(
      ['first-run', 'workout-exit-resume', 'reassessment', 'app-settings', 'sign-in', 'history'],
      4
    )
    expect(shards).toHaveLength(4)
    expect(shards.flatMap((s) => s.flows).sort()).toEqual([
      'app-settings',
      'first-run',
      'history',
      'reassessment',
      'sign-in',
      'workout-exit-resume',
    ])
    expect(Math.max(...shards.map((s) => s.estimatedSeconds))).toBeLessThanOrEqual(130)
    expect(balanceShards([], 4)).toEqual([])
  })

  it('skips docs/test PRs, narrows isolated screen PRs, and fails safe on shared/backend/unknown changes', () => {
    const available = listWebFlows()
    const prAll = defaultFlows(available, 'pr')
    expect(
      selectAffectedFlows(['README.md', 'docs/BUILDS.md', 'lib/__tests__/foo.test.ts'], {
        available,
      }).flows
    ).toEqual([])
    expect(selectAffectedFlows(['app/(first-run)/sport.tsx'], { available }).flows).toEqual([
      'first-run',
    ])
    expect(selectAffectedFlows(['app/(athlete)/history.tsx'], { available }).flows).toEqual([
      'history',
    ])
    expect(selectAffectedFlows(['app/(reassessment)/results.tsx'], { available }).flows).toEqual([
      'reassessment',
    ])
    expect(selectAffectedFlows(['components/workout/SetTracker.tsx'], { available }).flows).toEqual(
      ['workout-exit-resume']
    )
    for (const file of [
      'app/(athlete)/settings.tsx',
      'components/settings/TelemetryPreferencesCard.tsx',
      '.maestro/journeys/settings-telemetry.yaml',
    ]) {
      expect({ file, flows: selectAffectedFlows([file], { available }).flows }).toEqual({
        file,
        flows: ['app-settings', 'settings-telemetry', 'sign-in'],
      })
    }
    expect(selectAffectedFlows(['.maestro/journeys/feedback.yaml'], { available }).flows).toEqual([
      'feedback',
    ])
    expect(selectAffectedFlows(['app/(athlete)/profile.tsx'], { available }).flows).toEqual([
      'app-settings',
      'feedback',
      'settings-telemetry',
      'sign-in',
    ])
    // The feedback sheets are also opened from workout screens and the crash screen.
    expect(
      selectAffectedFlows(['components/feedback/BugReportSheet.tsx'], { available }).flows
    ).toEqual(prAll)
    // Shared/backend helpers must ALWAYS force the full PR suite
    expect(selectAffectedFlows(['lib/firstRunRoutes.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['lib/executionOrder.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['lib/sessionTiming.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['lib/weeksOnPlan.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['hooks/useFirstRunDraft.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['components/SignOutButton.tsx'], { available }).flows).toEqual(
      prAll
    )
    expect(
      selectAffectedFlows(['components/workout/ConfettiEffect.tsx'], { available }).flows
    ).toEqual(prAll)
    // Any file in runtimeFiles forces the full PR suite even if it matches a narrow path
    expect(
      selectAffectedFlows(['lib/sportFields.ts'], {
        available,
        runtimeFiles: ['lib/sportFields.ts'],
      }).flows
    ).toEqual(prAll)
    expect(selectAffectedFlows(['convex/workoutCalendar.ts'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['app/_layout.tsx'], { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(null, { available }).flows).toEqual(prAll)
    expect(selectAffectedFlows(['README.md'], { available, eventName: 'push' }).flows).toEqual(
      available
    )
  })

  it('merges shard results from disk and renders a skipped summary cleanly', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-shards-'))
    try {
      fs.mkdirSync(path.join(dir, 'e2e-results-shard-1'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'e2e-results-shard-2'), { recursive: true })
      fs.writeFileSync(
        path.join(dir, 'e2e-results-shard-1/web-results.json'),
        JSON.stringify({ flows: [{ flow: 'first-run', status: 'passed', seconds: 120 }] })
      )
      fs.writeFileSync(
        path.join(dir, 'e2e-results-shard-2/web-results.json'),
        JSON.stringify({ flows: [{ flow: 'sign-in', status: 'passed', seconds: 45 }] })
      )
      const merged = loadMergedResults({ file: path.join(dir, 'missing.json'), resultsDir: dir })
      expect(merged.map((f) => f.flow).sort()).toEqual(['first-run', 'sign-in'])
      const skipped = renderSummary({
        flows: ['sign-in'],
        results: [],
        artifacts: {},
        runUrl: '',
        skippedReason: 'docs only',
      })
      expect(skipped).toContain('Skipped on this PR: docs only')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
