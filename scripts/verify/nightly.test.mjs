import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { artifactName, evidenceDirFor, listWebFlows, root } from './flows.mjs'

const nightly = parse(fs.readFileSync(path.join(root, '.github/workflows/nightly-e2e.yml'), 'utf8'))
const checks = parse(fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8'))
const job = nightly.jobs['web-e2e']

describe('nightly E2E workflow', () => {
  it('runs on a schedule and by hand', () => {
    expect(nightly.on.schedule.length).toBe(1)
    expect(nightly.on).toHaveProperty('workflow_dispatch')
    expect(nightly.on).not.toHaveProperty('pull_request')
  })

  it("waits in the same e2e-backend queue as main's web E2E", () => {
    expect(job.concurrency).toEqual({
      group: 'e2e-backend',
      'cancel-in-progress': false,
      queue: 'max',
    })
    expect(checks.jobs['e2e-run'].concurrency.group).toContain("'e2e-backend'")
    expect(checks.jobs['e2e-run'].uses).toBe('./.github/workflows/web-e2e-run.yml')
  })

  it('uses the dev E2E key and never a preview key', () => {
    const convexSteps = job.steps.filter((step) =>
      /run\.mjs (deploy|all|teardown)$/.test(step.run || '')
    )
    expect(convexSteps.map((step) => step.run.split(' ').pop())).toEqual([
      'deploy',
      'all',
      'teardown',
    ])
    for (const step of convexSteps) {
      expect(step.env.CONVEX_DEPLOY_KEY_E2E).toBe('${{ secrets.CONVEX_DEPLOY_KEY_E2E }}')
      expect(step.env).not.toHaveProperty('CONVEX_PREVIEW_DEPLOY_KEY_E2E')
    }
    expect(convexSteps[0].id).toBe('backend')
    expect(job.env.CONVEX_PREVIEW_NAME_E2E).toBe('')
    expect(JSON.stringify(nightly)).not.toContain('CONVEX_PREVIEW_DEPLOY_KEY_E2E')
  })

  it('keeps secrets out of the install steps', () => {
    expect(JSON.stringify(job.env || {})).not.toContain('secrets.')
    for (const step of job.steps) {
      if (JSON.stringify(step.env || {}).includes('secrets.')) {
        expect(step.run).toMatch(/^node scripts\/verify\/run\.mjs (deploy|all|teardown)$/)
      }
    }
  })

  it('uploads every web flow only after its scrub marker exists', () => {
    const uploads = job.steps
      .filter((step) => String(step.uses || '').startsWith('actions/upload-artifact@'))
      .map((step) => ({ name: step.with.name, path: step.with.path, if: step.if }))
    for (const flow of listWebFlows()) {
      const evidence = `${path.relative(root, evidenceDirFor(flow))}/`
      expect(uploads).toContainEqual({
        name: artifactName(flow),
        path: evidence,
        if: `always() && hashFiles('${evidence}.scrubbed') != ''`,
      })
    }
  })

  it('tears down before uploading and writes the summary last', () => {
    const runs = job.steps.map((step) => step.run || step.uses || '')
    const index = (text) => runs.findIndex((run) => run.includes(text))
    expect(index('run.mjs deploy')).toBeLessThan(index('run.mjs all'))
    expect(index('run.mjs all')).toBeLessThan(index('run.mjs teardown'))
    expect(index('run.mjs teardown')).toBeLessThan(index('actions/upload-artifact@'))
    expect(index('actions/upload-artifact@')).toBeLessThan(index('summary.mjs'))
  })

  it('builds the gallery even when flows fail, and deploys it to Pages', () => {
    const gallery = nightly.jobs.gallery
    expect(gallery.needs).toBe('web-e2e')
    expect(gallery.if).toContain('!cancelled()')
    const runs = gallery.steps.map((step) => step.run || step.uses || '')
    expect(runs.some((run) => run.includes('gallery.mjs collect'))).toBe(true)
    expect(runs.some((run) => run.includes('gallery.mjs build'))).toBe(true)
    expect(runs.some((run) => run.startsWith('actions/upload-pages-artifact@'))).toBe(true)
    const deploy = nightly.jobs.deploy
    expect(deploy.environment.name).toBe('github-pages')
    expect(deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' })
    expect(deploy.steps[0].uses).toMatch(/^actions\/deploy-pages@/)
    expect(deploy.steps[1].run).toContain('GITHUB_STEP_SUMMARY')
    expect(deploy.steps[1].env.PAGE_URL).toBe('${{ steps.pages.outputs.page_url }}')
  })
})
