import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import {
  formatDiffArgs,
  isFormattableFile,
  parseNullSeparatedPaths,
  resolveDiffBase,
  selectFormatTargets,
} from './check-format.mjs'
import { evaluateBudget, parseBudgetArgs } from './run-budgeted.mjs'
import { listConvexTestFiles, planUnitTests, prChangedFilesArgs, root } from './select-tests.mjs'

const checks = parse(fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8'))
const runWorkflow = parse(
  fs.readFileSync(path.join(root, '.github/workflows/web-e2e-run.yml'), 'utf8')
)

describe('run-budgeted', () => {
  it('parses name, max-seconds, and command after --', () => {
    expect(
      parseBudgetArgs([
        '--name',
        'Typecheck',
        '--max-seconds',
        '60',
        '--',
        'bun',
        'run',
        'typecheck',
      ])
    ).toEqual({
      name: 'Typecheck',
      maxSeconds: 60,
      command: ['bun', 'run', 'typecheck'],
    })
    expect(() => parseBudgetArgs(['--max-seconds', '60'])).toThrow(/Missing '--'/)
    expect(() => parseBudgetArgs(['--max-seconds', '0', '--', 'echo'])).toThrow(/positive number/)
    expect(() => parseBudgetArgs(['--unknown', '1', '--max-seconds', '5', '--', 'echo'])).toThrow(
      /Unknown flag/
    )
  })

  it('passes within budget, fails over budget, and preserves child exit status', () => {
    expect(
      evaluateBudget({ name: 'Typecheck', elapsedSeconds: 9.4, maxSeconds: 60, exitStatus: 0 })
    ).toEqual({
      ok: true,
      exitCode: 0,
      message: '[budget] Typecheck: 9.4s / 60s',
    })
    const over = evaluateBudget({
      name: 'Typecheck',
      elapsedSeconds: 61.2,
      maxSeconds: 60,
      exitStatus: 0,
    })
    expect(over.ok).toBe(false)
    expect(over.exitCode).toBe(1)
    expect(over.message).toContain('exceeding 60s budget')

    const failed = evaluateBudget({
      name: 'Unit',
      elapsedSeconds: 4.1,
      maxSeconds: 120,
      exitStatus: 2,
    })
    expect(failed.ok).toBe(false)
    expect(failed.exitCode).toBe(2)
  })
})

describe('select-tests', () => {
  const convexTests = [
    'convex/__tests__/authGuards.test.ts',
    'convex/__tests__/programTemplatesDbIo.test.ts',
  ]
  const runtimeFiles = ['convex/workoutCalendar.ts', 'lib/executionOrder.ts', 'lib/today.ts']
  const allExist = () => true

  it('disables git rename detection so moves report both source and destination', () => {
    expect(prChangedFilesArgs()).toEqual(['diff', '--no-renames', '--name-only', 'HEAD^1', 'HEAD'])
  })

  it('runs the full randomized suite on push/manual events, missing diffs, config edits, and deleted code files', () => {
    expect(
      planUnitTests({
        eventName: 'push',
        changedFiles: ['README.md'],
        runtimeFiles,
        convexTests,
        exists: allExist,
      })
    ).toMatchObject({
      mode: 'full',
      jestArgs: ['--ci', '--randomize'],
    })
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: null,
        runtimeFiles,
        convexTests,
        exists: allExist,
      }).mode
    ).toBe('full')
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: ['jest.config.js'],
        runtimeFiles,
        convexTests,
        exists: allExist,
      }).mode
    ).toBe('full')
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: ['package.json'],
        runtimeFiles,
        convexTests,
        exists: allExist,
      }).mode
    ).toBe('full')
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: ['convex/schema.ts'],
        runtimeFiles,
        convexTests,
        exists: allExist,
      }).mode
    ).toBe('full')
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: ['lib/oldHelper.ts'],
        runtimeFiles,
        convexTests,
        exists: () => false,
      }).mode
    ).toBe('full')
  })

  it('skips pure documentation PRs but keeps tests that scan skill docs or Maestro notes', () => {
    expect(
      planUnitTests({
        eventName: 'pull_request',
        changedFiles: ['README.md', 'docs/BUILDS.md'],
        runtimeFiles,
        convexTests,
        exists: allExist,
      }).mode
    ).toBe('skip')

    const skillPlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['.claude/skills/verify-wander-fit/features/first-run.md'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(skillPlan.mode).toBe('related')
    expect(skillPlan.targets).toContain('scripts/verify/feature-map.test.mjs')

    const maestroNotePlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['.maestro/flow-layout.md'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(maestroNotePlan.mode).toBe('related')
    expect(maestroNotePlan.targets).toContain('scripts/verify/flows.test.mjs')
  })

  it('adds all convex/__tests__ suites when convex/ or convex-imported lib/ files change', () => {
    const convexPlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['convex/workoutCalendar.ts'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(convexPlan.mode).toBe('related')
    expect(convexPlan.targets).toEqual(
      expect.arrayContaining([
        'convex/workoutCalendar.ts',
        'convex/__tests__/authGuards.test.ts',
        'convex/__tests__/programTemplatesDbIo.test.ts',
        'scripts/verify/doctor.test.mjs',
      ])
    )

    const sharedLibPlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['lib/executionOrder.ts'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(sharedLibPlan.mode).toBe('related')
    expect(sharedLibPlan.targets).toEqual(expect.arrayContaining(convexTests))
    expect(listConvexTestFiles().length).toBeGreaterThan(10)
  })

  it('includes filesystem-scanning guard tests for screen, workflow, and Lottie edits', () => {
    const screenPlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['app/(first-run)/sport.tsx'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(screenPlan.targets).toEqual(
      expect.arrayContaining([
        'app/(first-run)/sport.tsx',
        'lib/__tests__/actionColor.test.ts',
        'lib/__tests__/typography.test.ts',
        'lib/__tests__/webDistributionConfig.test.ts',
        'scripts/verify/flows.test.mjs',
      ])
    )

    const workflowPlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['.github/workflows/checks.yml'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(workflowPlan.targets).toEqual([
      'scripts/ci/ci.test.mjs',
      'scripts/verify/flows.test.mjs',
      'scripts/verify/nightly.test.mjs',
    ])

    const lottiePlan = planUnitTests({
      eventName: 'pull_request',
      changedFiles: ['assets/lottie/sports/basketball.json'],
      runtimeFiles,
      convexTests,
      exists: allExist,
    })
    expect(lottiePlan.targets).toEqual(
      expect.arrayContaining([
        'lib/__tests__/sportAnimations.test.ts',
        'scripts/lottie/build.test.mjs',
      ])
    )
  })
})

describe('check-format', () => {
  it('uses --no-renames and -z so moved and non-ASCII filenames are preserved without quoting', () => {
    expect(formatDiffArgs()).toEqual([
      'diff',
      '--no-renames',
      '--name-only',
      '-z',
      'HEAD^1',
      'HEAD',
    ])
    expect(formatDiffArgs('abc123', 'HEAD')).toEqual([
      'diff',
      '--no-renames',
      '--name-only',
      '-z',
      'abc123',
      'HEAD',
    ])
    expect(parseNullSeparatedPaths('lib/café.ts\0app/(athlete)/index.tsx\0')).toEqual([
      'lib/café.ts',
      'app/(athlete)/index.tsx',
    ])
    expect(isFormattableFile('lib/café.ts')).toBe(true)
  })

  it('uses the push event before SHA on multi-commit pushes and HEAD^1 otherwise', () => {
    const sha = 'a'.repeat(40)
    expect(resolveDiffBase({ eventName: 'push', pushBefore: sha })).toBe(sha)
    expect(resolveDiffBase({ eventName: 'push', pushBefore: '0'.repeat(40) })).toBe('HEAD^1')
    expect(resolveDiffBase({ eventName: 'push', pushBefore: '' })).toBe('HEAD^1')
    expect(resolveDiffBase({ eventName: 'pull_request', pushBefore: sha })).toBe('HEAD^1')
  })

  it('filters to formattable extensions and excludes generated/ignored folders', () => {
    expect(isFormattableFile('app/(athlete)/index.tsx')).toBe(true)
    expect(isFormattableFile('scripts/ci/check-format.mjs')).toBe(true)
    expect(isFormattableFile('package.json')).toBe(true)
    expect(isFormattableFile('README.md')).toBe(false)
    expect(isFormattableFile('convex/_generated/api.d.ts')).toBe(false)
    expect(isFormattableFile('docs/first-run-v2/prototype/athlete.js')).toBe(false)
    expect(isFormattableFile('assets/lottie/sports/basketball.json')).toBe(false)
    expect(isFormattableFile('tsconfig.base.json')).toBe(false)
    expect(isFormattableFile('bun.lock')).toBe(false)
  })

  it('errors when git diff is unavailable, skips non-formattable diffs, and checks existing changed files', () => {
    expect(selectFormatTargets({ changedFiles: null }).mode).toBe('error')
    expect(
      selectFormatTargets({ changedFiles: ['README.md', 'docs/BUILDS.md'], exists: () => true })
        .mode
    ).toBe('skip')
    expect(
      selectFormatTargets({
        changedFiles: ['app/(athlete)/index.tsx', 'lib/deleted.ts', 'README.md'],
        exists: (file) => file !== 'lib/deleted.ts',
      })
    ).toMatchObject({
      mode: 'check',
      files: ['app/(athlete)/index.tsx'],
    })
  })
})

describe('CI workflow speed and budgets', () => {
  it('sets explicit timeout-minutes, blobless checkouts, Bun cache, and budgeted unit/typecheck/lint runs', () => {
    for (const name of ['unit', 'typecheck', 'lint', 'e2e-plan', 'web-e2e']) {
      expect(checks.jobs[name]['timeout-minutes']).toBeGreaterThan(0)
    }
    const unitCheckout = checks.jobs.unit.steps[0]
    expect(unitCheckout.with.filter).toBe('blob:none')
    expect(unitCheckout.with['fetch-depth']).toBe(
      "${{ github.event_name == 'pull_request' && 2 || 1 }}"
    )

    const lintCheckout = checks.jobs.lint.steps[0]
    expect(lintCheckout.with.filter).toBe('blob:none')
    expect(lintCheckout.with['fetch-depth']).toBe(
      "${{ github.event_name == 'push' && '0' || '2' }}"
    )

    const unitRun = checks.jobs.unit.steps.find((s) => (s.run || '').includes('select-tests.mjs'))
    expect(unitRun.run).toContain('run-budgeted.mjs')
    expect(unitRun.env.GITHUB_EVENT_NAME).toBe('${{ github.event_name }}')

    const typecheckRun = checks.jobs.typecheck.steps.find((s) =>
      (s.run || '').includes('typecheck')
    )
    expect(typecheckRun.run).toContain('run-budgeted.mjs')
    expect(typecheckRun.run).toContain('--max-seconds 30')

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    expect(pkg.scripts.typecheck).toBe('tsgo --noEmit')
    expect(pkg.scripts['typecheck:tsc']).toBe('tsc --noEmit')

    const lintRun = checks.jobs.lint.steps.find((s) => (s.run || '').includes('bun run lint'))
    expect(lintRun.run).toContain('run-budgeted.mjs')
    expect(lintRun.run).toContain('bun run format:check')
    expect(lintRun.env.GITHUB_EVENT_NAME).toBe('${{ github.event_name }}')
    expect(lintRun.env.GITHUB_PUSH_BEFORE).toBe('${{ github.event.before }}')

    for (const current of [
      checks.jobs.unit,
      checks.jobs.typecheck,
      checks.jobs.lint,
      runWorkflow.jobs['e2e-build'],
      runWorkflow.jobs['e2e-shard'],
    ]) {
      expect(current.steps.some((s) => String(s.uses || '').startsWith('actions/cache@'))).toBe(
        true
      )
      expect(current.steps[0].with?.filter).toBe('blob:none')
    }
  })

  it('ships valid oxlint, oxfmt, and hk configs', () => {
    const oxlint = JSON.parse(fs.readFileSync(path.join(root, '.oxlintrc.json'), 'utf8'))
    expect(oxlint.categories.correctness).toBe('error')
    expect(oxlint.categories.suspicious).toBe('error')

    const oxfmt = JSON.parse(fs.readFileSync(path.join(root, '.oxfmtrc.json'), 'utf8'))
    expect(oxfmt.semi).toBe(false)
    expect(oxfmt.singleQuote).toBe(true)

    const hk = fs.readFileSync(path.join(root, 'hk.pkl'), 'utf8')
    expect(hk).toContain('Builtins.oxfmt')
    expect(hk).toContain('Builtins.oxlint')
    expect(hk).toContain('bun run typecheck')
  })
})
