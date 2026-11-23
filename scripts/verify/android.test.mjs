import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import {
  ANDROID_FLOWS,
  androidSuiteSteps,
  appId,
  evidenceScrubbed,
  buildEnv,
  maestroArgs,
  root,
  selectAndroidFlows,
} from './android.mjs'
import { BLOCKED_CONVEX_HOSTS } from './targets.mjs'

const goodEnv = {
  EXPO_PUBLIC_CONVEX_URL_E2E: 'https://modest-kudu-493.convex.cloud',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
}

describe('buildEnv', () => {
  it('builds against the E2E backend and strips every secret', () => {
    const env = buildEnv({
      ...goodEnv,
      CLERK_SECRET_KEY: 'sk',
      CONVEX_DEPLOY_KEY: 'k',
      CONVEX_DEPLOY_KEY_E2E: 'k',
      CONVEX_PREVIEW_DEPLOY_KEY_E2E: 'k',
      TEST_USER_PASSWORD: 'p',
    })
    expect(env.EXPO_PUBLIC_CONVEX_URL).toBe('https://modest-kudu-493.convex.cloud')
    expect(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe('pk_test_abc')
    expect(env.EXPO_NO_DOTENV).toBe('1')
    const leaked = [
      'CLERK_SECRET_KEY',
      'CONVEX_DEPLOY_KEY',
      'CONVEX_DEPLOY_KEY_E2E',
      'CONVEX_PREVIEW_DEPLOY_KEY_E2E',
      'TEST_USER_PASSWORD',
    ].filter((name) => name in env)
    expect(leaked).toEqual([])
  })

  it('refuses the app backends, like the web runner', () => {
    for (const host of BLOCKED_CONVEX_HOSTS) {
      expect(() => buildEnv({ ...goodEnv, EXPO_PUBLIC_CONVEX_URL_E2E: `https://${host}` })).toThrow(
        /Refusing Convex host/
      )
    }
    expect(BLOCKED_CONVEX_HOSTS).toContain('fleet-mallard-22.convex.cloud')
  })

  it('refuses a missing or non-Convex backend URL and a missing Clerk key', () => {
    expect(() => buildEnv({ ...goodEnv, EXPO_PUBLIC_CONVEX_URL_E2E: '' })).toThrow(/E2E URL/)
    expect(() =>
      buildEnv({ ...goodEnv, EXPO_PUBLIC_CONVEX_URL_E2E: 'https://example.com' })
    ).toThrow(/E2E URL/)
    expect(() => buildEnv({ ...goodEnv, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'sk_test_x' })).toThrow(
      /publishable key/
    )
  })
})

describe('selectAndroidFlows', () => {
  it('runs every Android flow by default and rejects unknown names', () => {
    expect(selectAndroidFlows()).toEqual(Object.keys(ANDROID_FLOWS))
    expect(selectAndroidFlows(['native-launch', 'native-launch'])).toEqual(['native-launch'])
    expect(() => selectAndroidFlows(['nope'])).toThrow(/Not an Android flow: nope/)
  })

  it('only lists flows that exist and target the app', () => {
    for (const flow of Object.keys(ANDROID_FLOWS)) {
      const file = path.join(root, '.maestro/native', `${flow}.yaml`)
      const header = fs.readFileSync(file, 'utf8').split('\n---')[0]
      expect({ flow, appId: parse(header).appId }).toEqual({ flow, appId })
    }
  })
})

describe('maestroArgs', () => {
  it('runs one flow on Android with its own evidence folder', () => {
    const args = maestroArgs('native-launch', '/out/native-launch')
    expect(args.slice(0, 3)).toEqual(['test', '--platform', 'android'])
    expect(args).toContain('/out/native-launch/junit.xml')
    expect(args.at(-1)).toBe(path.join(root, '.maestro/native/native-launch.yaml'))
    expect(args.join(' ')).toContain('-e VERIFY_URL=native')
    expect(args.join(' ')).not.toContain('PERSONA_')
  })

  it("passes a persona's credentials as Maestro env", () => {
    const args = maestroArgs('sign-in', '/out/sign-in', { email: 'a@b.c', password: 'pw' })
    expect(args.join(' ')).toContain('-e PERSONA_EMAIL=a@b.c -e PERSONA_PASSWORD=pw')
    expect(args.at(-1)).toBe(path.join(root, '.maestro/native/sign-in.yaml'))
  })
})

describe('androidSuiteSteps', () => {
  const calls = []
  const io = {
    createPersona: (mode) => {
      calls.push(['create', mode])
      return { email: 'p@x', password: 'pw' }
    },
    runMaestro: (flow, persona) => calls.push(['maestro', flow, persona?.email ?? null]),
    redact: () => {},
    deletePersona: () => {},
  }

  it('signs a seeded persona in for sign-in and none for the signed-out launch', () => {
    const steps = androidSuiteSteps(io)
    expect(steps.createPersona('native-launch')).toBe(null)
    const persona = steps.createPersona('sign-in')
    steps.drive('sign-in', persona)
    expect(calls).toEqual([
      ['create', 'onboarded'],
      ['maestro', 'sign-in', 'p@x'],
    ])
  })

  it('withholds the evidence upload when any password scrub failed', () => {
    expect(
      evidenceScrubbed([{ status: 'passed' }, { status: 'failed', error: 'Maestro exited 1' }])
    ).toBe(true)
    expect(evidenceScrubbed([{ status: 'failed', error: 'redact failed: boom' }])).toBe(false)
  })
})

describe('android-e2e workflow', () => {
  const workflow = parse(
    fs.readFileSync(path.join(root, '.github/workflows/android-e2e.yml'), 'utf8')
  )
  const job = workflow.jobs['android-e2e']

  it('runs nightly, on dispatch, and on labelled same-repo PRs only', () => {
    expect(Object.keys(workflow.on).sort()).toEqual([
      'pull_request',
      'schedule',
      'workflow_dispatch',
    ])
    expect(job.if).toContain("contains(github.event.pull_request.labels.*.name, 'run-native-e2e')")
    expect(job.if).toContain('github.event.pull_request.head.repo.full_name == github.repository')
  })

  it('never deploys or takes the e2e-backend lock', () => {
    expect(JSON.stringify(workflow)).not.toMatch(/e2e-backend/)
    expect(job.steps.some((step) => /run\.mjs deploy/.test(step.run || ''))).toBe(false)
  })

  it('gives secrets only to the persona steps, never to the APK build', () => {
    const withSecrets = job.steps
      .filter((step) => /secrets\./.test(JSON.stringify(step)))
      .map((step) => step.name)
    expect(withSecrets).toEqual(['Run Android flows', 'Tear down personas'])
    expect(JSON.stringify(job.env)).not.toMatch(/secrets\./)
    const teardown = job.steps.find((step) => step.name === 'Tear down personas')
    expect({ if: teardown.if, run: teardown.run }).toEqual({
      if: 'always()',
      run: 'node scripts/verify/run.mjs teardown',
    })
  })

  it('builds the APK, runs the flows on an emulator, and uploads evidence', () => {
    const names = job.steps.map((step) => step.name)
    expect(names.indexOf('Build release APK')).toBeLessThan(names.indexOf('Run Android flows'))
    const emulator = job.steps.find((step) => step.name === 'Run Android flows')
    expect(emulator.uses).toMatch(/^reactivecircus\/android-emulator-runner@/)
    expect(emulator.with.script).toBe('node scripts/verify/android.mjs run')
    // ATD images capture black screenshots, so evidence needs google_apis.
    expect(emulator.with.target).toBe('google_apis')
    expect({ cores: emulator.with.cores, ram: emulator.with['ram-size'] }).toEqual({
      cores: 4,
      ram: '4096M',
    })
    const upload = job.steps.find((step) => step.name === 'Upload Android evidence')
    expect(upload.if).toBe("always() && hashFiles('e2e-artifacts/android/.scrubbed') != ''")
    expect(upload.with.path).toBe('e2e-artifacts/android/')
  })
})
