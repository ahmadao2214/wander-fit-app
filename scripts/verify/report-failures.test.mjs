import {
  errorBlock,
  failuresFrom,
  failuresFromJson,
  findOpenIssues,
  ghArgs,
  issueTitle,
  planReports,
  report,
  shouldFile,
  WITHHELD_ERROR,
} from './report-failures.mjs'

const runUrl = 'https://github.com/o/r/actions/runs/42'

describe('failuresFrom', () => {
  const results = [
    { flow: 'native-launch', status: 'passed' },
    { flow: 'sign-in', status: 'failed', error: 'Maestro exited 1' },
    { flow: 'sign-in', status: 'failed', error: 'again' },
  ]

  it('keeps each failed flow once and skips passes', () => {
    expect(failuresFrom(results, { scrubbed: true })).toEqual([
      { flow: 'sign-in', error: 'Maestro exited 1' },
    ])
  })

  it('reports android-run when the job died before results.json existed', () => {
    expect(failuresFrom(null).map((failure) => failure.flow)).toEqual(['android-run'])
  })

  it('withholds error text when the password scrub did not finish', () => {
    const leaked = [{ flow: 'sign-in', status: 'failed', error: 'redact failed: hunter2-secret' }]
    const failures = failuresFrom(leaked, { scrubbed: false })
    expect(failures).toEqual([{ flow: 'sign-in', error: WITHHELD_ERROR }])
    const logs = []
    const [item] = report({
      failures,
      gh: null,
      dryRun: true,
      runUrl,
      log: (line) => logs.push(line),
    })
    expect(`${item.body}\n${logs.join('\n')}`).not.toContain('hunter2-secret')
    expect(failuresFrom(leaked)[0].error).toBe(WITHHELD_ERROR)
  })
})

describe('failuresFromJson', () => {
  it('reads the Android job output, and reports android-run when it is empty or broken', () => {
    expect(failuresFromJson('[{"flow":"sign-in","error":"boom"},{"nope":1}]')).toEqual([
      { flow: 'sign-in', error: 'boom' },
    ])
    // The job failed but no flow did: still one android-run report.
    expect(failuresFromJson('[]').map((failure) => failure.flow)).toEqual(['android-run'])
    expect(failuresFromJson('').map((failure) => failure.flow)).toEqual(['android-run'])
    expect(failuresFromJson('{oops').map((failure) => failure.flow)).toEqual(['android-run'])
  })
})

describe('shouldFile', () => {
  it('files on nightly, dispatch and push runs only', () => {
    expect(['schedule', 'workflow_dispatch', 'push'].map(shouldFile)).toEqual([true, true, true])
    expect(['pull_request', '', undefined].map(shouldFile)).toEqual([false, false, false])
  })
})

describe('planReports', () => {
  const failures = [
    { flow: 'sign-in', error: 'Element not found' },
    { flow: 'native-launch', error: 'Maestro exited 1' },
  ]

  it('comments on the open issue with the exact title and opens one otherwise', () => {
    const plan = planReports({
      failures,
      openIssues: [
        { number: 7, title: 'E2E failure: sign-in (android)' },
        { number: 8, title: 'E2E failure: native-launch (web)' },
        { number: 9, title: 'E2E failure: native-launch (android) flaky' },
      ],
      runUrl,
    })
    expect(plan.map(({ action, number, title }) => ({ action, number, title }))).toEqual([
      { action: 'comment', number: 7, title: 'E2E failure: sign-in (android)' },
      { action: 'create', number: undefined, title: 'E2E failure: native-launch (android)' },
    ])
  })

  it('links the run and names the artifact and error', () => {
    const artifactUrl = `${runUrl}/artifacts/9`
    const [item] = planReports({ failures, openIssues: [], runUrl, artifactUrl })
    expect(item.body).toContain(`Run: ${runUrl}`)
    expect(item.body).toContain('`e2e-android`')
    expect(item.body).toContain(`(${artifactUrl})`)
    expect(item.body).toContain('Element not found')
    const [missing] = planReports({ failures, openIssues: [], runUrl })
    expect(missing.body).toContain('was not uploaded')
  })
})

describe('errorBlock', () => {
  it('truncates to 500 characters and fences the text so mentions and markdown are inert', () => {
    const block = errorBlock(`@someone \`x\` ${'a'.repeat(600)}`)
    const inner = block.split('\n')[1]
    expect(block.startsWith('```\n') && block.endsWith('\n```')).toBe(true)
    expect(inner.length).toBe(501)
    expect(inner).not.toContain('`')
    expect(errorBlock(undefined)).toContain('(no error text)')
  })
})

describe('ghArgs', () => {
  it('labels new issues e2e-failure and comments by number', () => {
    expect(ghArgs({ action: 'create', title: issueTitle('sign-in'), body: 'b' })).toEqual([
      'issue',
      'create',
      '--title',
      'E2E failure: sign-in (android)',
      '--label',
      'e2e-failure',
      '--body',
      'b',
    ])
    expect(ghArgs({ action: 'comment', number: 7, title: 't', body: 'b' })).toEqual([
      'issue',
      'comment',
      '7',
      '--body',
      'b',
    ])
  })
})

describe('report', () => {
  const failures = [{ flow: 'sign-in', error: 'boom' }]
  const fakeGh = (openIssues) => {
    const calls = []
    const gh = (args) => {
      calls.push(args)
      return args[1] === 'list' ? JSON.stringify(openIssues) : ''
    }
    return { gh, calls }
  }

  it('files nothing in a dry run', () => {
    const { gh, calls } = fakeGh([])
    const logs = []
    const plan = report({ failures, gh, dryRun: true, runUrl, log: (line) => logs.push(line) })
    expect(plan.map((item) => item.action)).toEqual(['create'])
    expect(calls.map((args) => args.slice(0, 2))).toEqual([['issue', 'list']])
    expect(logs.join('\n')).toContain('would create "E2E failure: sign-in (android)"')
  })

  it('creates or comments when filing', () => {
    const { gh, calls } = fakeGh([{ number: 3, title: 'E2E failure: sign-in (android)' }])
    report({ failures, gh, dryRun: false, runUrl, log: () => {} })
    expect(calls.map((args) => args.slice(0, 3))).toEqual([
      ['issue', 'list', '--state'],
      ['issue', 'comment', '3'],
    ])
  })

  it('does nothing when every flow passed', () => {
    const { gh, calls } = fakeGh([])
    expect(report({ failures: [], gh, dryRun: false, runUrl, log: () => {} })).toEqual([])
    expect(calls).toEqual([])
  })

  it('fails when the issue list fails on a filing run, and assumes none in a dry run', () => {
    const gh = () => {
      throw new Error('gh down')
    }
    expect(() => report({ failures, gh, dryRun: false, runUrl, log: () => {} })).toThrow('gh down')
    const plan = report({ failures, gh, dryRun: true, runUrl, log: () => {} })
    expect(plan.map((item) => item.action)).toEqual(['create'])
  })
})

describe('findOpenIssues', () => {
  it('searches open issues by title, with no label filter', () => {
    const calls = []
    const gh = (args) => {
      calls.push(args)
      return JSON.stringify([{ number: 4, title: 'E2E failure: sign-in (android)' }])
    }
    expect(findOpenIssues(gh, ['E2E failure: sign-in (android)'])).toEqual([
      { number: 4, title: 'E2E failure: sign-in (android)' },
    ])
    expect(calls[0]).toContain('"E2E failure: sign-in (android)" in:title')
    expect(calls[0]).not.toContain('--label')
  })

  it('finds an unlabelled open issue, so no duplicate is opened', () => {
    const gh = (args) =>
      args[1] === 'list' ? JSON.stringify([{ number: 4, title: issueTitle('sign-in') }]) : ''
    const plan = report({
      failures: [{ flow: 'sign-in', error: 'boom' }],
      gh,
      dryRun: false,
      runUrl,
      log: () => {},
    })
    expect(plan.map(({ action, number }) => ({ action, number }))).toEqual([
      { action: 'comment', number: 4 },
    ])
  })
})
